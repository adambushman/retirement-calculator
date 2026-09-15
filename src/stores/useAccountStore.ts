import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";

import { format } from 'd3-format';

import { prepareGrowthProjection } from '@/composeables/useProjections';
import type { AnnualProjection, FullProjection } from '@/composeables/useProjections';
import { formatRange } from '@/composeables/useHelpers';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';

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

  // Base reactive values
  const accountType = ref<AccountType>('traditional');
  const ownerName = ref<string>('');
  const withdrawalStartAge = ref<number>(60);
  const incomeReplacementGoGo = ref<number>(125);
  const incomeReplacementSlowGo = ref<number>(100);
  const incomeReplacementNoGo = ref<number>(75);
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
  const overrideRetirementBoundaries = ref<number[] | null>(null);


  // Computed properties
  const inflationPerspective = computed(() => {
    return inflationAdjChoice.value ? "inflation-adjusted" : "raw";
  });

  const yearsUntilRetirement = computed(() =>
    withdrawalStartAge.value - ageToday.value
  );

  const yearsInRetirement = computed(
    () => lifeExpectancy.value - withdrawalStartAge.value
  );

  const retirementBoundaries = computed<number[]>({
    get() {
      if (overrideRetirementBoundaries.value) {
        return overrideRetirementBoundaries.value;
      }

      // your default logic:
      const baseYrs = (yearsInRetirement.value * 2.0) / 5.0;

      return [
        Math.floor(baseYrs),
        Math.floor(baseYrs) * 2
      ].map((yr) => yr + withdrawalStartAge.value);
    },

    set(newValue: number[]) {
      overrideRetirementBoundaries.value = newValue;
    }
  });

  const yearsInGoGo = computed(() => {
    const def = withdrawalStartAge.value;
    return (retirementBoundaries.value[0] ?? def) - def;
  });

  const yearsInSlowGo = computed(() => {
    const def = yearsInGoGo.value + withdrawalStartAge.value;
    return (retirementBoundaries.value[1] ?? def) - def;
  });

  const yearsInNoGo = computed(
    () => yearsInRetirement.value - yearsInSlowGo.value - yearsInGoGo.value
  );

  const monthlyIncome = computed(() => annualIncome.value / 12);

  const totalInflationPreRetirement = computed(
    () => yearsUntilRetirement.value * annualInflation.value
  );

  const totalInflationIntraRetirement = computed(
    () => yearsInRetirement.value * annualInflation.value
  );

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

  const annualIncomeAtRetirement = computed(
    // Income in the final working year: compound the annual raise once per
    // completed working year. Year 1 is worked at today's salary (no raise yet,
    // matching the projection engine), so the exponent is one less than the
    // number of years until retirement.
    () =>
      annualIncome.value *
      Math.pow(
        1 + annualRaises.value / 100,
        Math.max(0, yearsUntilRetirement.value - 1)
      )
  );

  const monthlyIncomeAtRetirement = computed(
    () => annualIncomeAtRetirement.value / 12
  );

  const monthlyGoGoWithdrawal = computed(
    () =>
      (monthlyIncomeAtRetirement.value *
        (incomeReplacementGoGo.value / 100)) *
      -1
  );

  const monthlySlowGoWithdrawal = computed(
    () =>
      (monthlyIncomeAtRetirement.value *
        (incomeReplacementSlowGo.value / 100)) *
      -1
  );

  const monthlyNoGoWithdrawal = computed(
    () =>
      (monthlyIncomeAtRetirement.value *
        (incomeReplacementNoGo.value / 100)) *
      -1
  );

  const futureProjection = computed(() => {
    const stages = [
      {
        name: "Pre-retirement",
        growth: growthRatePreRetirement.value,
        years: yearsUntilRetirement.value,
        monthlyValue: firstMonthlyContribution.value,
        // A flat-dollar contribution stays fixed; a percent-of-income
        // contribution grows with income, i.e. with annual raises.
        annualIncrease: contributionMode.value === 'percent' ? annualRaises.value : 0
      },
      {
        name: "Go-Go Years",
        growth: growthRateIntraRetirement.value,
        years: yearsInGoGo.value,
        monthlyValue: monthlyGoGoWithdrawal.value,
        annualIncrease: 0
      },
      {
        name: "Slow-Go Years",
        growth: growthRateIntraRetirement.value,
        years: yearsInSlowGo.value,
        monthlyValue: monthlySlowGoWithdrawal.value,
        annualIncrease: 0
      },
      {
        name: "No-Go Years",
        growth: growthRateIntraRetirement.value,
        years: yearsInNoGo.value,
        monthlyValue: monthlyNoGoWithdrawal.value,
        annualIncrease: 0
      },
    ];

    return prepareGrowthProjection({
      currentBalance: currentBalance.value,
      annualInflation: annualInflation.value,
      stages,
    });
  });

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
        finalGoGoBalance: 0,
        finalSlowGoBalance: 0,
        finalNoGoBalance: 0,
        totalPreRetirementFlow: 0,
        totalPreRetirementGrowth: 0,
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
      finalPreRetirementBalance: finalBalance("Pre-retirement"),
      totalPreRetirementFlow: totalFlow("Pre-retirement"),
      totalPreRetirementGrowth: totalGrowth("Pre-retirement"),
      finalGoGoBalance: finalBalance("Go-Go Years"),
      totalGoGoFlow: totalFlow("Go-Go Years"),
      totalGoGoGrowth: totalGrowth("Go-Go Years"),
      finalSlowGoBalance: finalBalance("Slow-Go Years"),
      totalSlowGoFlow: totalFlow("Slow-Go Years"),
      totalSlowGoGrowth: totalGrowth("Slow-Go Years"),
      finalNoGoBalance: finalBalance("No-Go Years"),
      totalNoGoFlow: totalFlow("No-Go Years"),
      totalNoGoGrowth: totalGrowth("No-Go Years"),
    };
  });

  const avgMonthlyWithdrawal = computed(() => {
    const arr = futureProjection.value?.[inflationPerspective.value];
    if (!arr || arr.length === 0) {
      return 0
    }

    const retirement = arr.filter(a => a.stage !== "Pre-retirement");
    if (retirement.length === 0) return 0;
    return retirement.reduce((sum, a) => sum + (a?.annualFlow ?? 0), 0) / retirement.length / 12;
  });

  const finalPreRetirementBalance = computed(
    (): number => futureProjectionResults.value.finalPreRetirementBalance
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
  const totalGoGoGrowth = computed(
    (): number => futureProjectionResults.value.totalGoGoGrowth
  );
  const totalSlowGoGrowth = computed(
    (): number => futureProjectionResults.value.totalSlowGoGrowth
  );
  const totalNoGoGrowth = computed(
    (): number => futureProjectionResults.value.totalNoGoGrowth
  );

  const recommendations = computed(() => {
    const recs_array: Array<string> = [];
    const industry = {
      savingsRate: [15, 25],
      growthRatePreRetirement: [7, 10],
      growthRateIntraRetirement: [3, 6],
      annualIncome: 70000,
      withdrawalStartAge: [58, 67],
      lifeExpectancy: [70, 85],
      yearsInGoGo: [8, 14],
    };

    if(finalNoGoBalance.value < 0) {
      // Recommendations when balance is negative

      // Earning & savings approaches
      if(contributionMode.value === 'percent' && savingsRate.value < industry.savingsRate[0]!)
        recs_array.push(`Consider increasing your savings/contribution rate (${formatRange(industry.savingsRate, '', '%')})`);

      if(growthRatePreRetirement.value < industry.growthRatePreRetirement[0]!)
        recs_array.push(`Increase the pre-retirement growth rate to a more likely level (${formatRange(industry.growthRatePreRetirement, '', '%')})`);

      if(annualIncome.value < industry.annualIncome)
        recs_array.push(`Brainstorm avenues to increase your annual income closer to the US median (${format('$,.0f')(industry.annualIncome)})`);

      // Retirement plan approaches
      if(growthRateIntraRetirement.value < industry.growthRateIntraRetirement[0]!)
        recs_array.push(`Increase the intra-retirement growth rate to a more reasonable range (${formatRange(industry.growthRateIntraRetirement, '', '%')})`);

      if(withdrawalStartAge.value < industry.withdrawalStartAge[0]!)
        recs_array.push(`Consider shifting the target withdrawal start age back so you have more time to save (${formatRange(industry.withdrawalStartAge, '', '')})`);

      if(lifeExpectancy.value > industry.lifeExpectancy[1]!)
        recs_array.push(`Re-think how many years you anticipate living (${formatRange(industry.lifeExpectancy, '', '')})`);

      if(yearsInGoGo.value > industry.yearsInGoGo[1]!)
        recs_array.push(`Adjust your plan for years in the "Go-Go" stage (${formatRange(industry.yearsInGoGo, '', '')})`);
    } else if(finalNoGoBalance.value >= 50000) {
      // Recommendations when balance is dramatically positive

      // Earning & savings approaches
      if(growthRatePreRetirement.value > industry.growthRatePreRetirement[1]!)
        recs_array.push(`Decrease the pre-retirement growth rate to a more likely level (${formatRange(industry.growthRatePreRetirement, '', '%')})`);

      if(contributionMode.value === 'percent' && savingsRate.value > industry.savingsRate[1]!)
        recs_array.push(`Consider lowering your savings/contribution rate (${formatRange(industry.savingsRate, '', '%')})`);

      // Retirement plan approaches
      if(growthRateIntraRetirement.value > industry.growthRateIntraRetirement[1]!)
        recs_array.push(`Reduce the intra-retirement growth rate to a more reasonable range (${formatRange(industry.growthRateIntraRetirement, '', '%')})`);

      if(yearsInGoGo.value < industry.yearsInGoGo[0]!)
        recs_array.push(`Consider increasing your plan for years in the "Go-Go" stage (${formatRange(industry.yearsInGoGo, '', '')})`);

      if(lifeExpectancy.value < industry.lifeExpectancy[0]!)
        recs_array.push(`You may want to place for a longer life expectancy (${formatRange(industry.lifeExpectancy, '', '')})`);

      if(withdrawalStartAge.value > industry.withdrawalStartAge[1]!)
        recs_array.push(`Consider moving up your target withdrawal start age (${formatRange(industry.withdrawalStartAge, '', '')})`);
    }

    return recs_array;
  });

  watch(
    [yearsInRetirement, withdrawalStartAge, lifeExpectancy],
    () => {
      if (!overrideRetirementBoundaries.value) return;

      const [b1, b2] = overrideRetirementBoundaries.value;

      const min = withdrawalStartAge.value;
      const max = lifeExpectancy.value;

      const outOfRange = (b1 ?? 0) < min || (b2 ?? 0) > max;

      if (outOfRange) {
        overrideRetirementBoundaries.value = null;
      }
    },
    { deep: false }
  );


  // Return all necessary state
  return {
    // Portfolio-level values (read-only aliases; edit via
    // usePortfolioAssumptionsStore)
    ageToday,
    annualIncome,
    annualRaises,
    lifeExpectancy,
    annualInflation,

    // Account-level base values
    accountType,
    ownerName,
    withdrawalStartAge,
    incomeReplacementGoGo,
    incomeReplacementSlowGo,
    incomeReplacementNoGo,
    currentBalance,
    contributionMode,
    savingsRate,
    contributionAmount,
    growthRatePreRetirement,
    growthRateIntraRetirement,
    inflationAdjChoice,

    // Computed values
    inflationPerspective,
    retirementBoundaries,
    yearsUntilRetirement,
    yearsInRetirement,
    yearsInGoGo,
    yearsInSlowGo,
    yearsInNoGo,
    monthlyIncome,
    firstMonthlyContribution,
    setContributionMode,
    annualIncomeAtRetirement,
    projectionGraph,
    avgMonthlyWithdrawal,
    futureProjectionResults,
    finalPreRetirementBalance,
    finalGoGoBalance,
    finalSlowGoBalance,
    finalNoGoBalance,
    totalPreRetirementFlow,
    totalGoGoFlow,
    totalSlowGoFlow,
    totalNoGoFlow,
    totalPreRetirementGrowth,
    totalGoGoGrowth,
    totalSlowGoGrowth,
    totalNoGoGrowth,
    recommendations,
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
 * another. Portfolio-level fields (ageToday, annualIncome, etc.) are read-only
 * aliases onto the single shared usePortfolioAssumptionsStore, so both source
 * and target already see the same values — nothing to copy there.
 */
export function copyAccountFields(source: AccountStoreInstance, target: AccountStoreInstance) {
  target.accountType = source.accountType;
  target.ownerName = source.ownerName;
  target.withdrawalStartAge = source.withdrawalStartAge;
  target.incomeReplacementGoGo = source.incomeReplacementGoGo;
  target.incomeReplacementSlowGo = source.incomeReplacementSlowGo;
  target.incomeReplacementNoGo = source.incomeReplacementNoGo;
  target.currentBalance = source.currentBalance;
  target.contributionMode = source.contributionMode;
  target.savingsRate = source.savingsRate;
  target.contributionAmount = source.contributionAmount;
  target.growthRatePreRetirement = source.growthRatePreRetirement;
  target.growthRateIntraRetirement = source.growthRateIntraRetirement;
  target.inflationAdjChoice = source.inflationAdjChoice;
  target.retirementBoundaries = [...source.retirementBoundaries];
}
