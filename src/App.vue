<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import PlotFigure from '@/components/PlotFigure.vue';
import { format } from 'd3-format';

import { ref, toRefs, computed } from 'vue';
import { prepareGrowthProjection } from '@/composeables/useProjections';

import type { FullProjection } from '@/composeables/useProjections';

const ageToday = ref<number>(30);
const ageRetirement = ref<number>(65);
const lifeExpectancy = ref<number>(90);
const annualIncome = ref<number>(187000); // 100000
const incomeReplacementGoGo = ref<number>(125);
const incomeReplacementSlowGo = ref<number>(100);
const incomeReplacementNoGo = ref<number>(75);
const currentBalance = ref<number>(140000); // 50000
const annualRaises = ref<number>(1); // 0
const savingsRate = ref<number>(12);
const growthRatePreRetirement = ref<number>(7.5);
const growthRateIntraRetirement = ref<number>(4);
const annualInflation = ref<number>(2.5);
const inflationPerspective = ref<keyof FullProjection>("raw");

const yearsUntilRetirement = computed(() => {
  return ageRetirement.value - ageToday.value;
});
const yearsInRetirement = computed(() => {
  return lifeExpectancy.value - ageRetirement.value;
});
const yearsInGoGo = computed(() => {
  return 75 - (ageRetirement.value);
})
const yearsInSlowGo = computed(() => {
  return 85 - yearsInGoGo.value - (ageRetirement.value);
})
const yearsInNoGo = computed(() => {
  return yearsInRetirement.value - yearsInSlowGo.value - yearsInGoGo.value;
})
const monthlyIncome = computed(() => {
  return annualIncome.value / 12;
});
const totalInflationPreRetirement = computed(() => {
  return yearsUntilRetirement.value * annualInflation.value;
});
const totalInflationIntraRetirement = computed(() => {
  return yearsInRetirement.value * annualInflation.value;
});
const totalRaises = computed(() => {
  return yearsUntilRetirement.value * annualRaises.value;
});
const firstMonthlyContribution = computed(() => {
  return annualIncome.value * (savingsRate.value / 100) / 12;
});
const annualIncomeAtRetirement = computed(() => {
  return annualIncome.value * (1 + (totalRaises.value / 100));
});
const monthlyIncomeAtRetirement = computed(() => {
  return annualIncomeAtRetirement.value / 12;
});
const monthlyGoGoWithdrawal = computed(() => {
  return (monthlyIncomeAtRetirement.value * (incomeReplacementGoGo.value / 100)) * -1;
});
const monthlySlowGoWithdrawal = computed(() => {
  return (monthlyIncomeAtRetirement.value * (incomeReplacementSlowGo.value / 100)) * -1;
});
const monthlyNoGoWithdrawal = computed(() => {
  return (monthlyIncomeAtRetirement.value * (incomeReplacementNoGo.value / 100)) * -1;
});

const futureProjection = computed(() => {
  const stages = [
    {
      name: 'Pre-retirement',
      growth: growthRatePreRetirement.value,
      years: yearsUntilRetirement.value,
      monthlyValue: firstMonthlyContribution.value,
    },
    {
      name: 'Go-Go Years',
      growth: growthRateIntraRetirement.value,
      years: yearsInGoGo.value,
      monthlyValue: monthlyGoGoWithdrawal.value,
    },
    {
      name: 'Slow-Go Years',
      growth: growthRateIntraRetirement.value,
      years: yearsInSlowGo.value,
      monthlyValue: monthlySlowGoWithdrawal.value,
    },
    {
      name: 'No-Go Years',
      growth: growthRateIntraRetirement.value,
      years: yearsInNoGo.value,
      monthlyValue: monthlyNoGoWithdrawal.value,
    },
  ];

  console.log(stages);

  return prepareGrowthProjection({
    currentBalance: currentBalance.value,
    annualRaises: annualRaises.value,
    annualInflation: annualInflation.value,
    stages: stages,
  });
});


const projectionGraph = computed(() => {
  const projectionData = futureProjection.value?.[inflationPerspective.value];
  if (!projectionData) {
    return [];
  }
  return projectionData.map((d, i) => {
    return {
      age: i + ageToday.value,
      stage: d.stage,
      balance: d.endBalance ?? 0,
    };
  });
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

  const finalPreRetirement = arr.filter(a => a.stage === 'Pre-retirement').slice(-1)[0];
  const finalPreRetirementBalance = finalPreRetirement?.endBalance ?? 0;

  const finalGoGoYears = arr.filter(a => a.stage === 'Go-Go Years').slice(-1)[0];
  const finalGoGoYearsBalance = finalGoGoYears?.endBalance ?? 0;

  const finalSlowGoYears = arr.filter(a => a.stage === 'Slow-Go Years').slice(-1)[0];
  const finalSlowGoYearsBalance = finalSlowGoYears?.endBalance ?? 0;

  const finalNoGoYears = arr.filter(a => a.stage === 'No-Go Years').slice(-1)[0];
  const finalNoGoYearsBalance = finalNoGoYears?.endBalance ?? 0;

  return {
    finalPreRetirementBalance,
    finalGoGoYearsBalance,
    finalSlowGoYearsBalance,
    finalNoGoYearsBalance,
  };
});
const finalPreRetirementBalance = computed(() => futureProjectionResults.value.finalPreRetirementBalance);
const finalGoGoYearsBalance = computed(() => futureProjectionResults.value.finalGoGoYearsBalance);
const finalSlowGoYearsBalance = computed(() => futureProjectionResults.value.finalSlowGoYearsBalance);
const finalNoGoYearsBalance = computed(() => futureProjectionResults.value.finalNoGoYearsBalance);


// Withdrawal rate
// Annual income at retirement
// Annual income at retirement (infl. adj)
// Annual income in retirement
// Annual income in retirement (infl. adj)
// Remaining account balance(s) after living years (infl. adj)

</script>

<template>
<div class="space-y-6 p-6">
  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Your Age Today</label>
      <input
      type="text"
      v-model.number="ageToday"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Age of Retirement</label>
      <input
      type="text"
      v-model.number="ageRetirement"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Life Expectancy</label>
      <input
      type="text"
      v-model.number="lifeExpectancy"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Annual Income Today</label>
      <input
      type="text"
      v-model.number="annualIncome"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Annual Raises</label>
      <input
      type="text"
      v-model.number="annualRaises"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Go-Go Years</label>
      <input
      type="text"
      v-model.number="incomeReplacementGoGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Slow-Go Years</label>
      <input
      type="text"
      v-model.number="incomeReplacementSlowGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label
      class="block mb-2 text-gray-700"
      >No-Go Years</label>
      <input
      type="text"
      v-model.number="incomeReplacementNoGo"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>


  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Investment Balance Today</label>
      <input
      type="text"
      v-model.number="currentBalance"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Savings/Contribution Rate</label>
      <input
      type="text"
      v-model.number="savingsRate"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-6">
    <div>
      <label
      class="block mb-2 text-gray-700"
      >Growth Rate (Pre-Retirement)</label>
      <input
      type="text"
      v-model.number="growthRatePreRetirement"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Growth Rate (Intra-Retirement)</label>
      <input
      type="text"
      v-model.number="growthRateIntraRetirement"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div>
      <label
      class="block mb-2 text-gray-700"
      >Annual Inflation</label>
      <input
      type="text"
      v-model.number="annualInflation"
      class="border border-gray-300 text-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <div class="flex space-x-1 items-center">
    <input type="radio" id="raw" value="raw" v-model="inflationPerspective" name="" />
    <label for="raw" class="me-10">Raw</label>

    <input type="radio" id="infl-adj" value="inflation-adjusted" v-model="inflationPerspective" name="" />
    <label for="infl-adj">Inflation Adjusted</label>
  </div>
</div>

<div>
<h1>Pre-Retirement End Balance (Raw): {{ format("$,.2f")(finalPreRetirementBalance) }}</h1>
<h1>Go-Go Years End Balance (Raw): {{ format("$,.2f")(finalGoGoYearsBalance) }}</h1>
<h1>Slow-Go Years End Balance (Raw): {{ format("$,.2f")(finalSlowGoYearsBalance) }}</h1>
<h1>No-Go Years End Balance (Raw): {{ format("$,.2f")(finalNoGoYearsBalance) }}</h1>
</div>

<div>
  <PlotFigure
    :options="{
      marginLeft: 65,
      marks: [
        Plot.barY(projectionGraph, {x: 'age', y: 'balance', fill: 'stage'}),
      ],
    }"
  />
</div>

</template>

<style scoped>

</style>
