import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { prepareGrowthProjection } from '@/composeables/useProjections';
import type { AnnualProjection, FullProjection } from '@/composeables/useProjections';

export const useRetirementStore = defineStore("retirement", () => {
  // Base reactive values
  const ageToday = ref<number>(30);
  const ageRetirement = ref<number>(65);
  const lifeExpectancy = ref<number>(90);
  const annualIncome = ref<number>(187000);
  const incomeReplacementGoGo = ref<number>(125);
  const incomeReplacementSlowGo = ref<number>(100);
  const incomeReplacementNoGo = ref<number>(75);
  const currentBalance = ref<number>(140000);
  const annualRaises = ref<number>(1);
  const savingsRate = ref<number>(12);
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
      console.log("baseYrs", baseYrs);

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
        finalGoGoYearsBalance: 0,
        finalSlowGoYearsBalance: 0,
        finalNoGoYearsBalance: 0,
      };
    }

    const finalStage = (stageName: string) =>
      arr.filter(a => a.stage === stageName).slice(-1)[0]?.endBalance ?? 0;

    return {
      finalPreRetirementBalance: finalStage("Pre-retirement"),
      finalGoGoYearsBalance: finalStage("Go-Go Years"),
      finalSlowGoYearsBalance: finalStage("Slow-Go Years"),
      finalNoGoYearsBalance: finalStage("No-Go Years"),
    };
  });

  const finalPreRetirementBalance = computed(
    () => futureProjectionResults.value.finalPreRetirementBalance
  );
  const finalGoGoYearsBalance = computed(
    () => futureProjectionResults.value.finalGoGoYearsBalance
  );
  const finalSlowGoYearsBalance = computed(
    () => futureProjectionResults.value.finalSlowGoYearsBalance
  );
  const finalNoGoYearsBalance = computed(
    () => futureProjectionResults.value.finalNoGoYearsBalance
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
        console.log("Override boundaries invalid, resetting to defaults");
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
    futureProjectionResults,
    finalPreRetirementBalance,
    finalGoGoYearsBalance,
    finalSlowGoYearsBalance,
    finalNoGoYearsBalance,
  };
});
