import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";

import { balanceAtAge, type AnnualProjection } from '@/composeables/useProjections';
import { usePortfolioSimulation } from '@/composeables/usePortfolioSimulation';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { ACCUMULATION_ID, effectiveWithdrawalStartAge } from '@/composeables/useStages';
import { ACCOUNT_TYPE_RULES } from '@/composeables/useAccountTypes';
import { naiveAccumulate } from '@/composeables/useNaiveAccountProjection';

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
  const annualInflation = computed(() => assumptions.annualInflation);

  // The retirementAge replacement — see useRetirementPlanStore. Falls back
  // to lifeExpectancy when the user has deleted every stage, so nothing
  // downstream ever treats "no stages" as "retiring today".
  const retirementPlan = useRetirementPlanStore();
  const firstStageStartAge = computed(() => retirementPlan.firstStageStartAge ?? lifeExpectancy.value);

  // Base reactive values
  const accountType = ref<AccountType>('traditional');
  const ownerName = ref<string>('');
  const currentBalance = ref<number>(10000);
  // Savings/contribution rate can be expressed as a flat monthly dollar
  // amount or as a percent of (portfolio-level) annual income — see
  // setContributionMode, which converts between the two so the effective
  // contribution stays the same at the moment of toggling.
  const contributionMode = ref<ContributionMode>('percent');
  const savingsRate = ref<number>(15);
  const contributionAmount = ref<number>(500);
  const growthRatePreRetirement = ref<number>(8.5);
  const growthRateIntraRetirement = ref<number>(5.5);
  const inflationAdjChoice = ref<boolean>(false);
  // Only meaningful for Brokerage, which has no penalty-free withdrawal age
  // of its own (see ACCOUNT_TYPE_RULES) — the naive projection below falls
  // back to this whenever a type's rule is null. Ignored for Traditional/
  // Roth, which use their fixed 59.5 instead.
  const naiveWithdrawalAge = ref<number>(59.5);

  // Restates the naive projection's own KPI (Balance at Target Age) in
  // today's dollars — independent of the complex engine's own
  // inflationAdjChoice above, which governs the chart/stage breakdown
  // instead. On by default so every figure opens in today's purchasing power;
  // see naiveInflationFactor.
  const naiveInflationAdjChoice = ref<boolean>(true);

  // Which of the household's income streams (see usePortfolioAssumptionsStore)
  // this account's percent-of-income contribution is measured against and
  // escalates with — null means "Total Annual Income" (the default, and the
  // only option available while a household has just one stream). Only
  // meaningful in percent contribution mode; left untouched across a switch
  // to dollar mode so it's still there if the user switches back.
  const incomeStreamId = ref<string | null>(null);


  // Computed properties
  const inflationPerspective = computed(() => {
    return inflationAdjChoice.value ? "inflation-adjusted" : "raw";
  });

  // No longer a standalone editable field — an account's effective
  // withdrawal start age is entirely derived from the plan: the start age
  // of the earliest stage where this account's own share of that stage's
  // target is above 0% (see StageCard.vue's "Withdrawal Share by Account").
  // Infinity when no stage ever draws on this account at all (it never
  // withdraws — see useAccountProjection.ts, which treats that exactly like
  // any other age that never arrives within the modeled timeline).
  const withdrawalStartAge = computed(() => effectiveWithdrawalStartAge(retirementPlan.stages, id));

  // How many years this account actually spends contributing: it stops
  // exactly when withdrawals begin from it, its own effective withdrawal
  // start age (see computePortfolioSimulation's contributingCutoffAge).
  const yearsUntilRetirement = computed(() => withdrawalStartAge.value - ageToday.value);

  // Traditional/Roth can't withdraw before 59; a taxable Brokerage account
  // can be tapped any time from today; nothing can be later than life
  // expectancy. Only relevant for Brokerage (Traditional/Roth ignore
  // naiveWithdrawalAge entirely) — this is the *naive* onboarding
  // projection's own age, unrelated to the real, now-derived
  // withdrawalStartAge above.
  const naiveWithdrawalAgeBounds = computed(() => ({
    min: ageToday.value,
    max: lifeExpectancy.value,
  }));

  // The specific income stream this account's contribution is tied to, if
  // any. Undefined if incomeStreamId points at a stream that's since been
  // deleted — see isIncomeStreamMissing, which distinguishes that from
  // "not tied to a stream at all" (incomeStreamId === null).
  const referencedIncomeStream = computed(() =>
    incomeStreamId.value === null
      ? null
      : assumptions.incomeStreams.find((s) => s.id === incomeStreamId.value)
  );

  // True once this account was tied to a stream that no longer exists. The
  // math never breaks either way — contributionIncomeAmount/contributionRaises
  // below fall back to the household total the same as "not tied to a
  // stream" — this just flags it for the UI so it doesn't happen silently.
  const isIncomeStreamMissing = computed(
    () => incomeStreamId.value !== null && !referencedIncomeStream.value
  );

  // The income amount and raise rate this account's percent-of-income
  // contribution is based on: the specifically referenced stream's own
  // figures, or the household's blended total/rate when this account isn't
  // tied to one (or was, and that stream is gone).
  const contributionIncomeAmount = computed(
    () => referencedIncomeStream.value?.annualAmount ?? annualIncome.value
  );
  const contributionRaises = computed(
    () => referencedIncomeStream.value?.annualRaises ?? annualRaises.value
  );

  const monthlyIncome = computed(() => contributionIncomeAmount.value / 12);

  const firstMonthlyContribution = computed(() =>
    contributionMode.value === 'dollar'
      ? contributionAmount.value
      : (contributionIncomeAmount.value * (savingsRate.value / 100)) / 12
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

  // A second, independent projection used only by this account's own card
  // (subtitle + "Potential" section) — see useNaiveAccountProjection.ts for
  // why it's closed-form rather than a year-by-year loop, and why it
  // deliberately ignores Withdrawal Start Age, Withdrawal Share, and
  // Retirement Age entirely. The cross-account engine below (futureProjection
  // etc.) is untouched and still drives the chart/stage breakdown.
  const naiveTargetAge = computed(
    () => ACCOUNT_TYPE_RULES[accountType.value].penaltyFreeWithdrawalAge ?? naiveWithdrawalAge.value
  );

  const naiveYearsToTarget = computed(() => naiveTargetAge.value - ageToday.value);

  const naiveBalanceAtTargetAgeNominal = computed(() =>
    naiveAccumulate(
      currentBalance.value,
      firstMonthlyContribution.value,
      growthRatePreRetirement.value,
      naiveYearsToTarget.value
    )
  );

  // Cumulative inflation between today and the target age — dividing a
  // nominal dollar figure at that age by this restates it in today's
  // purchasing power, the same convention applyInflationAdjustment uses for
  // the complex engine's year-by-year rows (see useProjections.ts).
  const naiveInflationFactor = computed(() =>
    Math.pow(1 + annualInflation.value / 100, Math.max(0, naiveYearsToTarget.value))
  );

  const naiveBalanceAtTargetAge = computed(() =>
    naiveInflationAdjChoice.value
      ? naiveBalanceAtTargetAgeNominal.value / naiveInflationFactor.value
      : naiveBalanceAtTargetAgeNominal.value
  );

  // The shared, year-by-year timeline engine — see useAccountProjection.ts
  // for how contributing/dormant/withdrawing years are determined per year,
  // and usePortfolioSimulation.ts for how every account's
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

  // Per-stage (plus Accumulation) totals for this account, keyed by stage id
  // — replaces the old fixed set of individually-named
  // finalGoGoBalance/totalBridgeFlow/etc. computeds with one map looped over
  // whichever stages actually exist.
  const stageResults = computed<Record<string, { finalBalance: number; totalFlow: number; totalGrowth: number }>>(() => {
    const arr = futureProjection.value?.[inflationPerspective.value];
    const ids = [ACCUMULATION_ID, ...retirementPlan.stages.map((s) => s.id)];

    const result: Record<string, { finalBalance: number; totalFlow: number; totalGrowth: number }> = {};
    for (const id of ids) {
      if (!arr || arr.length === 0) {
        result[id] = { finalBalance: 0, totalFlow: 0, totalGrowth: 0 };
        continue;
      }
      const stageRows = arr.filter((a) => a.stage === id);
      result[id] = {
        finalBalance: stageRows.slice(-1)[0]?.endBalance ?? 0,
        totalFlow: stageRows.reduce((sum, a) => sum + (a?.annualFlow ?? 0), 0),
        totalGrowth: stageRows.reduce((sum, a) => sum + (a?.totalGrowth ?? 0), 0),
      };
    }
    return result;
  });

  // The balance right as withdrawals begin — i.e. this account's own
  // accumulation-phase endpoint. Not simply stageResults[ACCUMULATION_ID]'s
  // finalBalance: an account whose own withdrawal start age is later than
  // the first stage's start age keeps growing, untouched, through a dormant
  // gap between the two, which that figure wouldn't capture.
  const balanceAtWithdrawalStart = computed((): number =>
    balanceAtAge(
      futureProjection.value?.[inflationPerspective.value],
      ageToday.value,
      withdrawalStartAge.value,
      currentBalance.value
    )
  );

  const avgMonthlyWithdrawal = computed(() => {
    const arr = futureProjection.value?.[inflationPerspective.value];
    if (!arr || arr.length === 0) {
      return 0
    }

    const retirement = arr.filter(a => a.stage !== ACCUMULATION_ID);
    if (retirement.length === 0) return 0;
    return retirement.reduce((sum, a) => sum + (a?.annualFlow ?? 0), 0) / retirement.length / 12;
  });

  // Derived directly from the balances/contributions above (rather than
  // stageResults' Accumulation totalGrowth) so it stays exact even across a
  // dormant gap: today's balance + contributed + grew === balance at
  // withdrawal start.
  const growthToWithdrawalStart = computed((): number =>
    balanceAtWithdrawalStart.value - currentBalance.value - (stageResults.value[ACCUMULATION_ID]?.totalFlow ?? 0)
  );

  watch(naiveWithdrawalAgeBounds, ({ min, max }) => {
    if (naiveWithdrawalAge.value < min) naiveWithdrawalAge.value = min;
    else if (naiveWithdrawalAge.value > max) naiveWithdrawalAge.value = max;
  });


  // Return all necessary state
  return {
    // Portfolio-level values (read-only aliases; edit via
    // usePortfolioAssumptionsStore)
    ageToday,
    annualIncome,
    annualRaises,
    lifeExpectancy,
    firstStageStartAge,
    annualInflation,

    // Account-level base values
    accountType,
    ownerName,
    withdrawalStartAge,
    currentBalance,
    contributionMode,
    savingsRate,
    contributionAmount,
    growthRatePreRetirement,
    growthRateIntraRetirement,
    inflationAdjChoice,
    naiveWithdrawalAge,
    naiveWithdrawalAgeBounds,
    naiveInflationAdjChoice,
    incomeStreamId,

    // Computed values
    inflationPerspective,
    yearsUntilRetirement,
    referencedIncomeStream,
    isIncomeStreamMissing,
    contributionIncomeAmount,
    contributionRaises,
    monthlyIncome,
    firstMonthlyContribution,
    setContributionMode,
    // The account card's own projection — see useNaiveAccountProjection.ts.
    // Independent of everything below (futureProjection etc.), which still
    // drives the chart/stage breakdown via Withdrawal Start Age.
    naiveTargetAge,
    naiveBalanceAtTargetAgeNominal,
    naiveInflationFactor,
    naiveBalanceAtTargetAge,
    // Exposed (in addition to projectionGraph, which is tied to this
    // account's own inflationPerspective) so a portfolio-wide aggregate can
    // pick raw or inflation-adjusted independently of any one account's own
    // toggle — see usePortfolioProjection.ts.
    futureProjection,
    projectionGraph,
    avgMonthlyWithdrawal,
    stageResults,
    balanceAtWithdrawalStart,
    growthToWithdrawalStart,
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
 * another. Portfolio-level fields (ageToday, annualIncome, etc.) are
 * read-only aliases onto the single shared usePortfolioAssumptionsStore, and
 * withdrawalStartAge is a derived read-only value sourced from the
 * retirement plan's stages (see effectiveWithdrawalStartAge) — neither is
 * copyable, nothing to do for them here.
 */
export function copyAccountFields(source: AccountStoreInstance, target: AccountStoreInstance) {
  target.accountType = source.accountType;
  target.ownerName = source.ownerName;
  target.currentBalance = source.currentBalance;
  target.contributionMode = source.contributionMode;
  target.savingsRate = source.savingsRate;
  target.contributionAmount = source.contributionAmount;
  target.growthRatePreRetirement = source.growthRatePreRetirement;
  target.growthRateIntraRetirement = source.growthRateIntraRetirement;
  target.inflationAdjChoice = source.inflationAdjChoice;
  target.naiveWithdrawalAge = source.naiveWithdrawalAge;
  target.naiveInflationAdjChoice = source.naiveInflationAdjChoice;
  target.incomeStreamId = source.incomeStreamId;
}
