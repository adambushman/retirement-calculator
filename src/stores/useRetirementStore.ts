import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { prepareGrowthProjection } from '@/composeables/useProjections';
import type { AnnualProjection, FullProjection } from '@/composeables/useProjections';

export const useRetirementStore = defineStore("retirement", () => {
  // Base reactive values
  const ageToday = ref<number>(25);
  const ageRetirement = ref<number>(60);
  const lifeExpectancy = ref<number>(90);
  const annualIncome = ref<number>(100000);
  const incomeReplacementGoGo = ref<number>(125);
  const incomeReplacementSlowGo = ref<number>(100);
  const incomeReplacementNoGo = ref<number>(75);
  const currentBalance = ref<number>(10000);
  const annualRaises = ref<number>(1);
  const savingsRate = ref<number>(15);
  const growthRatePreRetirement = ref<number>(7.5);
  const growthRateIntraRetirement = ref<number>(4);
  const annualInflation = ref<number>(2.5);
  const inflationAdjChoice = ref<boolean>(false);
  const overrideRetirementBoundaries = ref<number[] | null>(null);


  // Computed properties
  const inflationPerspective = computed(() => {
    return inflationAdjChoice.value ? "inflation-adjusted" : "raw";
  });

  const yearsUntilRetirement = computed(() =>
    ageRetirement.value - ageToday.value
  );

  const yearsInRetirement = computed(
    () => lifeExpectancy.value - ageRetirement.value
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
      ].map((yr) => yr + ageRetirement.value);
    },

    set(newValue: number[]) {
      overrideRetirementBoundaries.value = newValue;
    }
  });

  const yearsInGoGo = computed(() => {
    const def = ageRetirement.value;
    return (retirementBoundaries.value[0] ?? def) - def;
  });

  const yearsInSlowGo = computed(() => {
    const def = yearsInGoGo.value + ageRetirement.value;
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

  const totalRaises = computed(
    () => yearsUntilRetirement.value * annualRaises.value
  );

  const firstMonthlyContribution = computed(
    () => (annualIncome.value * (savingsRate.value / 100)) / 12
  );

  const annualIncomeAtRetirement = computed(
    () => annualIncome.value * (1 + totalRaises.value / 100)
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
      },
      {
        name: "Go-Go Years",
        growth: growthRateIntraRetirement.value,
        years: yearsInGoGo.value,
        monthlyValue: monthlyGoGoWithdrawal.value,
      },
      {
        name: "Slow-Go Years",
        growth: growthRateIntraRetirement.value,
        years: yearsInSlowGo.value,
        monthlyValue: monthlySlowGoWithdrawal.value,
      },
      {
        name: "No-Go Years",
        growth: growthRateIntraRetirement.value,
        years: yearsInNoGo.value,
        monthlyValue: monthlyNoGoWithdrawal.value,
      },
    ];

    return prepareGrowthProjection({
      currentBalance: currentBalance.value,
      annualRaises: annualRaises.value,
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

  watch(
    [yearsInRetirement, ageRetirement, lifeExpectancy],
    () => {
      if (!overrideRetirementBoundaries.value) return;

      const [b1, b2] = overrideRetirementBoundaries.value;

      const min = ageRetirement.value;
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
    // Base values
    ageToday,
    ageRetirement,
    lifeExpectancy,
    annualIncome,
    incomeReplacementGoGo,
    incomeReplacementSlowGo,
    incomeReplacementNoGo,
    currentBalance,
    annualRaises,
    savingsRate,
    growthRatePreRetirement,
    growthRateIntraRetirement,
    annualInflation,
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
  };
});
