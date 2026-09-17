<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'd3-format';

import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';

const assumptions = usePortfolioAssumptionsStore();

const dollars = format('$,.0f');
const percent = format('.2~f');

// Mirrors PortfolioAssumptionsModal's fields/labels exactly, as a read-only
// echo of what's currently set. Retirement-plan specifics (retirement age,
// stage lengths, withdrawal rates) live in the Retirement Plan section
// instead — see RetirementPlanInputs.vue.
const basicsRows = computed(() => [
  { label: 'Your Age Today', value: String(assumptions.ageToday) },
  { label: 'Life Expectancy', value: String(assumptions.lifeExpectancy) },
  { label: 'Annual Inflation', value: `${percent(assumptions.annualInflation)}%` },
]);

const incomeRows = computed(() => [
  ...assumptions.incomeStreams.map((s) => ({
    label: s.name || 'Unnamed',
    amount: dollars(s.annualAmount),
    raises: `${percent(s.annualRaises)}%`,
    total: false,
  })),
  {
    label: 'Total Annual Income',
    amount: dollars(assumptions.annualIncome),
    // The blended, amount-weighted rate — see annualRaises on the store.
    raises: `${percent(assumptions.annualRaises)}%`,
    total: true,
  },
]);
</script>

<template>
  <div class="grid gap-10 sm:grid-cols-2">
    <div>
      <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Basics</h4>
      <table class="w-full text-sm border-collapse">
        <tbody>
          <tr
            v-for="row in basicsRows"
            :key="row.label"
            class="border-b border-surface-100 dark:border-surface-800 last:border-0"
          >
            <td class="py-1.5 pr-2 text-gray-400 align-top">{{ row.label }}</td>
            <td class="py-1.5 font-medium text-right">{{ row.value }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Income</h4>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th class="pb-1.5 pr-2 text-left font-normal text-gray-400">Name</th>
            <th class="pb-1.5 px-2 text-right font-normal text-gray-400">Annual Amount</th>
            <th class="pb-1.5 pl-2 text-right font-normal text-gray-400">Annual Raises</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in incomeRows"
            :key="row.label"
            class="border-b border-surface-100 dark:border-surface-800 last:border-0"
            :class="row.total && 'border-t border-surface-200 dark:border-surface-700'"
          >
            <td class="py-1.5 pr-2 align-top" :class="row.total ? 'font-medium' : 'text-gray-400'">
              {{ row.label }}
            </td>
            <td class="py-1.5 px-2 text-right" :class="row.total ? 'font-semibold' : 'font-medium'">
              {{ row.amount }}
            </td>
            <td class="py-1.5 pl-2 text-right" :class="row.total ? 'font-semibold' : 'font-medium'">
              {{ row.raises }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
