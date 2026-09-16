import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";

import type { AnnualProjection } from '@/composeables/useProjections';
import { usePortfolioSimulation } from '@/composeables/usePortfolioSimulation';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { STAGE_PRE_RETIREMENT, STAGE_BRIDGE, STAGE_GO_GO, STAGE_SLOW_GO, STAGE_NO_GO } from '@/composeables/useStages';

// Pinia stores are normally singletons keyed by a fixed id. To model several
// independent accounts with the exact same shape (inputs, projection engine,
// computed summaries), each account gets its own store instance keyed by a
// dynamic id — `defineStore` is called once per account id and cached here,
// so re-requesting the same id returns the same live store instead of a fresh
// definition. `persist: true` (via pinia-plugin-persistedstate, see main.ts)
// saves each instance to localStorage under its own key (`account-<id>`).
const accountStoreDefs = new Map<string, ReturnType<typeof defineAccountStore>>();

export type AccountType = 'traditional' | 'roth' | 'brokerage';
export type ContributionMode = 'percent' | 'dollar';

function defineAccountStore(id: string, persist: boolean) {
  return defineStore(`account-${id}`, () => {
  // Shared across every account — see usePortfolioAssumptionsStore. Exposed
  // here as read-only aliases so every computed below can keep referencing
  // them exactly as if they were local, account-level fields.
  const assumptions = usePortfolioAssumptionsStore();
  const ageToday = computed(() => assumptions.ageToday);
  const annualIncome = computed(() => assumptions.annualIncome);
  const annualRaises = computed(() => assumptions.annualRaises);
  const lifeExpectancy = computed(() => assumptions.lifeExpectancy);
  const retirementAge = computed(() => assumptions.retirementAge);
  const annualInflation = computed(() => assumptions.annualInflation);
  // Bridge/Go/Slow/No-Go withdrawal rates and stage lengths are
  // portfolio-wide too (edit via usePortfolioAssumptionsStore).
  const incomeReplacementBridge = computed(() => assumptions.incomeReplacementBridge);
  const incomeReplacementGoGo = computed(() => assumptions.incomeReplacementGoGo);
  const incomeReplacementSlowGo = computed(() => assumptions.incomeReplacementSlowGo);
  const incomeReplacementNoGo = computed(() => assumptions.incomeReplacementNoGo);
  const retirementBoundaries = computed(() => assumptions.retirementBoundaries);
  const yearsInGoGo = computed(() => assumptions.yearsInGoGo);
  const yearsInSlowGo = computed(() => assumptions.yearsInSlowGo);
  const yearsInNoGo = computed(() => assumptions.yearsInNoGo);

  // Base reactive values
  const accountType = ref<AccountType>('traditional');
  const ownerName = ref<string>('');
  const withdrawalStartAge = ref<number>(60);
  // How much of the portfolio's target income-replacement dollar amount (in
  // whichever stage this account is eligible for) this account is
  // responsible for withdrawing — see the redesign notes; a portfolio's
  // accounts don't need to sum to 100 and nothing enforces that yet.
  const withdrawalShare = ref<number>(100);
  const currentBalance = ref<number>(10000);
  // Savings/contribution rate can be expressed as a flat monthly dollar
  // amount or as a percent of (portfolio-level) annual income — see
  // setContributionMode, which converts between the two so the effective
  // contribution stays the same at the moment of toggling.
  const contributionMode = ref<ContributionMode>('percent');
  const savingsRate = ref<number>(15);
  const contributionAmount = ref<number>(500);
  const growthRatePreRetirement = ref<number>(8);
  const growthRateIntraRetirement = ref<number>(4);
  const inflationAdjChoice = ref<boolean>(false);


  // Computed properties
  const inflationPerspective = computed(() => {
    return inflationAdjChoice.value ? "inflation-adjusted" : "raw";
  });

  // How many years this account actually spends contributing: it stops at
  // whichever comes first, its own withdrawal start age or the portfolio's
  // Retirement Age (see computePortfolioSimulation's contributingCutoffAge).
  const yearsUntilRetirement = computed(() =>
    Math.min(withdrawalStartAge.value, retirementAge.value) - ageToday.value
  );

  // Traditional/Roth accounts can't withdraw before 59; a taxable brokerage
  // can be tapped any time from today; nothing can be later than life
  // expectancy. See the watch below, which clamps the value back in range
  // whenever account type or the portfolio ages change.
  const withdrawalStartAgeBounds = computed(() => ({
    min: accountType.value === 'brokerage' ? ageToday.value : 59,
    max: lifeExpectancy.value,
  }));

  const monthlyIncome = computed(() => annualIncome.value / 12);

  const firstMonthlyContribution = computed(() =>
    contributionMode.value === 'dollar'
      ? contributionAmount.value
      : (annualIncome.value * (savingsRate.value / 100)) / 12
  );

  // Switches between flat-dollar and percent-of-income contribution modes,
  // converting the current effective monthly contribution into the new
  // mode's units so the switch itself doesn't change the projection.
  function setContributionMode(mode: ContributionMode) {
    if (mode === contributionMode.value) return;

    const currentMonthly = firstMonthlyContribution.value;
    if (mode === 'dollar') {
      contributionAmount.value = Math.round(currentMonthly);
    } else {
      const monthlyIncomeValue = monthlyIncome.value;
      savingsRate.value = monthlyIncomeValue > 0
        ? Math.round((currentMonthly / monthlyIncomeValue) * 1000) / 10
        : 0;
    }
    contributionMode.value = mode;
  }

  // The shared, year-by-year timeline engine — see useAccountProjection.ts
  // for how contributing/dormant/Bridge/Go-Go/Slow-Go/No-Go are determined
  // per year, and usePortfolioSimulation.ts for how every account's
  // withdrawal is run jointly (so a depleted sibling's share gets picked up
  // by this account instead of just going unmet). Called lazily here, rather
  // than at store setup time, so a self-reference back to this same account
  // (as one of the portfolio's accounts) resolves to the already-registered
  // store instead of recursing into its own construction.
  const futureProjection = computed(() => usePortfolioSimulation().projectionFor(id));

  const projectionGraph = computed(() => {
    const projectionData = futureProjection.value?.[inflationPerspective.value];
    if (!projectionData) return [];

    return projectionData.map((d: AnnualProjection, i: number) => ({
      age: i + ageToday.value,
      stage: d.stage,
      balance: d.endBalance ?? 0,
    }));
  });

  const futureProjectionResults = computed(() => {
    const arr = futureProjection.value?.[inflationPerspective.value];
    if (!arr || arr.length === 0) {
      return {
        finalPreRetirementBalance: 0,
        finalBridgeBalance: 0,
        finalGoGoBalance: 0,
        finalSlowGoBalance: 0,
        finalNoGoBalance: 0,
        totalPreRetirementFlow: 0,
        totalPreRetirementGrowth: 0,
        totalBridgeFlow: 0,
        totalBridgeGrowth: 0,
        totalGoGoFlow: 0,
        totalGoGoGrowth: 0,
        totalSlowGoFlow: 0,
        totalSlowGoGrowth: 0,
        totalNoGoFlow: 0,
        totalNoGoGrowth: 0,
      };
    }

    const finalBalance = (stageName: string) =>
      arr.filter(a => a.stage === stageName).slice(-1)[0]?.endBalance ?? 0;

    const totalFlow = (stageName: string) =>
      arr.filter(a => a.stage === stageName).reduce((sum, a) => sum + (a?.annualFlow ?? 0), 0);

    const totalGrowth = (stageName: string) =>
      arr.filter(a => a.stage === stageName).reduce((sum, a) => sum + (a?.totalGrowth ?? 0), 0);

    return {
      finalPreRetirementBalance: finalBalance(STAGE_PRE_RETIREMENT),
      totalPreRetirementFlow: totalFlow(STAGE_PRE_RETIREMENT),
      totalPreRetirementGrowth: totalGrowth(STAGE_PRE_RETIREMENT),
      finalBridgeBalance: finalBalance(STAGE_BRIDGE),
      totalBridgeFlow: totalFlow(STAGE_BRIDGE),
      totalBridgeGrowth: totalGrowth(STAGE_BRIDGE),
      finalGoGoBalance: finalBalance(STAGE_GO_GO),
      totalGoGoFlow: totalFlow(STAGE_GO_GO),
      totalGoGoGrowth: totalGrowth(STAGE_GO_GO),
      finalSlowGoBalance: finalBalance(STAGE_SLOW_GO),
      totalSlowGoFlow: totalFlow(STAGE_SLOW_GO),
      totalSlowGoGrowth: totalGrowth(STAGE_SLOW_GO),
      finalNoGoBalance: finalBalance(STAGE_NO_GO),
      totalNoGoFlow: totalFlow(STAGE_NO_GO),
      totalNoGoGrowth: totalGrowth(STAGE_NO_GO),
    };
  });

  // The balance right as withdrawals begin — i.e. this account's own
  // accumulation-phase endpoint. Not simply finalPreRetirementBalance: an
  // account whose own withdrawal start age is later than the portfolio's
  // Retirement Age keeps growing, untouched, through a dormant gap between
  // the two, which finalPreRetirementBalance wouldn't capture.
  const balanceAtWithdrawalStart = computed((): number => {
    const arr = futureProjection.value?.[inflationPerspective.value];
    if (!arr || arr.length === 0) return currentBalance.value;

    const index = withdrawalStartAge.value - ageToday.value;
    if (index <= 0) return currentBalance.value;
    if (index >= arr.length) return arr[arr.length - 1]!.endBalance;
    return arr[index]!.startBalance;
  });

  const avgMonthlyWithdrawal = computed(() => {
    const arr = futureProjection.value?.[inflationPerspective.value];
    if (!arr || arr.length === 0) {
      return 0
    }

    const retirement = arr.filter(a => a.stage !== STAGE_PRE_RETIREMENT);
    if (retirement.length === 0) return 0;
    return retirement.reduce((sum, a) => sum + (a?.annualFlow ?? 0), 0) / retirement.length / 12;
  });

  const finalPreRetirementBalance = computed(
    (): number => futureProjectionResults.value.finalPreRetirementBalance
  );
  const finalBridgeBalance = computed(
    (): number => futureProjectionResults.value.finalBridgeBalance
  );
  const finalGoGoBalance = computed(
    (): number => futureProjectionResults.value.finalGoGoBalance
  );
  const finalSlowGoBalance = computed(
    (): number => futureProjectionResults.value.finalSlowGoBalance
  );
  const finalNoGoBalance = computed(
    (): number => futureProjectionResults.value.finalNoGoBalance
  );

  const totalPreRetirementFlow = computed(
    (): number => futureProjectionResults.value.totalPreRetirementFlow
  );

  // Derived directly from the balances/contributions above (rather than
  // totalPreRetirementGrowth) so it stays exact even across a dormant gap:
  // today's balance + contributed + grew === balance at withdrawal start.
  const growthToWithdrawalStart = computed((): number =>
    balanceAtWithdrawalStart.value - currentBalance.value - totalPreRetirementFlow.value
  );
  const totalBridgeFlow = computed(
    (): number => futureProjectionResults.value.totalBridgeFlow
  );
  const totalGoGoFlow = computed(
    (): number => futureProjectionResults.value.totalGoGoFlow
  );
  const totalSlowGoFlow = computed(
    (): number => futureProjectionResults.value.totalSlowGoFlow
  );
  const totalNoGoFlow = computed(
    (): number => futureProjectionResults.value.totalNoGoFlow
  );

  const totalPreRetirementGrowth = computed(
    (): number => futureProjectionResults.value.totalPreRetirementGrowth
  );
  const totalBridgeGrowth = computed(
    (): number => futureProjectionResults.value.totalBridgeGrowth
  );
  const totalGoGoGrowth = computed(
    (): number => futureProjectionResults.value.totalGoGoGrowth
  );
  const totalSlowGoGrowth = computed(
    (): number => futureProjectionResults.value.totalSlowGoGrowth
  );
  const totalNoGoGrowth = computed(
    (): number => futureProjectionResults.value.totalNoGoGrowth
  );

  watch(withdrawalStartAgeBounds, ({ min, max }) => {
    if (withdrawalStartAge.value < min) withdrawalStartAge.value = min;
    else if (withdrawalStartAge.value > max) withdrawalStartAge.value = max;
  });


  // Return all necessary state
  return {
    // Portfolio-level values (read-only aliases; edit via
    // usePortfolioAssumptionsStore)
    ageToday,
    annualIncome,
    annualRaises,
    lifeExpectancy,
    retirementAge,
    annualInflation,
    incomeReplacementBridge,
    incomeReplacementGoGo,
    incomeReplacementSlowGo,
    incomeReplacementNoGo,
    retirementBoundaries,
    yearsInGoGo,
    yearsInSlowGo,
    yearsInNoGo,

    // Account-level base values
    accountType,
    ownerName,
    withdrawalStartAge,
    withdrawalStartAgeBounds,
    withdrawalShare,
    currentBalance,
    contributionMode,
    savingsRate,
    contributionAmount,
    growthRatePreRetirement,
    growthRateIntraRetirement,
    inflationAdjChoice,

    // Computed values
    inflationPerspective,
    yearsUntilRetirement,
    monthlyIncome,
    firstMonthlyContribution,
    setContributionMode,
    // Exposed (in addition to projectionGraph, which is tied to this
    // account's own inflationPerspective) so a portfolio-wide aggregate can
    // pick raw or inflation-adjusted independently of any one account's own
    // toggle — see usePortfolioProjection.ts.
    futureProjection,
    projectionGraph,
    avgMonthlyWithdrawal,
    futureProjectionResults,
    balanceAtWithdrawalStart,
    growthToWithdrawalStart,
    finalPreRetirementBalance,
    finalBridgeBalance,
    finalGoGoBalance,
    finalSlowGoBalance,
    finalNoGoBalance,
    totalPreRetirementFlow,
    totalBridgeFlow,
    totalGoGoFlow,
    totalSlowGoFlow,
    totalNoGoFlow,
    totalPreRetirementGrowth,
    totalBridgeGrowth,
    totalGoGoGrowth,
    totalSlowGoGrowth,
    totalNoGoGrowth,
  };
  }, persist ? { persist: true } : {});
}

function getAccountStore(id: string, persist: boolean) {
  let def = accountStoreDefs.get(id);
  if (!def) {
    def = defineAccountStore(id, persist);
    accountStoreDefs.set(id, def);
  }
  return def();
}

/** Get (or lazily create) the persisted store instance for one account. */
export function useAccountStore(id: string) {
  return getAccountStore(id, true);
}

// A scratch store for the account wizard modal: edits are staged here and
// only copied onto the real account (via copyAccountFields) when Done is
// clicked, so closing the modal any other way discards them. Never
// persisted; a fresh instance is minted per modal session (see
// AccountFormModal.vue, which disposes it on close).
export function useDraftAccountStore() {
  return getAccountStore(`draft-${crypto.randomUUID()}`, false);
}

export type AccountStoreInstance = ReturnType<typeof useAccountStore>;

/**
 * Copies every account-level editable field from one account store to
 * another. Portfolio-level fields (ageToday, annualIncome, the withdrawal
 * rates/stage lengths, etc.) are read-only aliases onto the single shared
 * usePortfolioAssumptionsStore, so both source and target already see the
 * same values — nothing to copy there.
 */
export function copyAccountFields(source: AccountStoreInstance, target: AccountStoreInstance) {
  target.accountType = source.accountType;
  target.ownerName = source.ownerName;
  target.withdrawalStartAge = source.withdrawalStartAge;
  target.withdrawalShare = source.withdrawalShare;
  target.currentBalance = source.currentBalance;
  target.contributionMode = source.contributionMode;
  target.savingsRate = source.savingsRate;
  target.contributionAmount = source.contributionAmount;
  target.growthRatePreRetirement = source.growthRatePreRetirement;
  target.growthRateIntraRetirement = source.growthRateIntraRetirement;
  target.inflationAdjChoice = source.inflationAdjChoice;
}
