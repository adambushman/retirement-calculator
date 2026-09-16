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
const rows = computed(() => [
  { label: 'Annual Income Today (Gross)', value: dollars(assumptions.annualIncome) },
  { label: 'Annual Raises', value: `${percent(assumptions.annualRaises)}%` },
  { label: 'Your Age Today', value: String(assumptions.ageToday) },
  { label: 'Life Expectancy', value: String(assumptions.lifeExpectancy) },
  { label: 'Annual Inflation', value: `${percent(assumptions.annualInflation)}%` },
]);

// Split into 3 columns as evenly as possible (remainder rows go to the
// earliest columns) so desktop shows three tidy, similarly-sized tables
// side by side no matter how many rows end up in the list above.
const columns = computed(() => {
  const numColumns = 3;
  const base = Math.floor(rows.value.length / numColumns);
  const remainder = rows.value.length % numColumns;

  const result: (typeof rows.value)[] = [];
  let index = 0;
  for (let i = 0; i < numColumns; i++) {
    const size = base + (i < remainder ? 1 : 0);
    result.push(rows.value.slice(index, index + size));
    index += size;
  }
  return result;
});
</script>

<template>
  <div class="grid gap-10 sm:grid-cols-3">
    <table v-for="(column, i) in columns" :key="i" class="w-full text-sm border-collapse">
      <tbody>
        <tr
          v-for="row in column"
          :key="row.label"
          class="border-b border-surface-100 dark:border-surface-800 last:border-0"
        >
          <td class="py-1.5 pr-2 text-gray-400 align-top">{{ row.label }}</td>
          <td class="py-1.5 font-medium text-right">{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
