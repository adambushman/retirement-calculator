<script setup lang="ts">
import { computed, inject } from 'vue';

import InputNumber from '@/volt/InputNumber.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';
import { format } from 'd3-format';

const store = inject(AccountStoreKey)!;

const dollars = format('$,.0f');
const percent = format('.1~f');

// A single field whose meaning (flat $/mo vs. % of annual income) follows
// store.contributionMode, so the InputNumber below can bind to one v-model
// regardless of which unit is currently active.
const contributionValue = computed<number>({
  get: () => store.contributionMode === 'dollar' ? store.contributionAmount : store.savingsRate,
  set: (value) => {
    if (store.contributionMode === 'dollar') store.contributionAmount = value;
    else store.savingsRate = value;
  },
});

const contributionHelperText = computed(() => {
  if (store.contributionMode === 'dollar') {
    return store.monthlyIncome > 0
      ? `≈ ${percent((store.contributionAmount / store.monthlyIncome) * 100)}% of monthly income`
      : '';
  }
  return `≈ ${dollars(store.firstMonthlyContribution)}/mo`;
});
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="current-balance-input"
      >Account Balance Today</label>
      <InputNumber
      v-model.number="store.currentBalance"
      inputId="current-balance-input"
      size="small"
      prefix="$"
      />
    </div>

    <div>
      <label class="block text-sm mb-2 text-gray-400" for="contribution-input">Savings/Contribution Rate</label>
      <div class="flex items-center gap-2">
        <InputNumber
          v-model.number="contributionValue"
          inputId="contribution-input"
          size="small"
          :prefix="store.contributionMode === 'dollar' ? '$' : undefined"
          :suffix="store.contributionMode === 'percent' ? '%' : undefined"
        />
        <div class="flex rounded-full border border-surface-300 dark:border-surface-700 p-0.5">
          <button
            type="button"
            aria-label="Flat dollar amount"
            @click="store.setContributionMode('dollar')"
            class="w-7 h-7 rounded-full text-xs font-medium transition-colors"
            :class="store.contributionMode === 'dollar'
              ? 'bg-primary text-primary-contrast'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
          >$</button>
          <button
            type="button"
            aria-label="Percent of income"
            @click="store.setContributionMode('percent')"
            class="w-7 h-7 rounded-full text-xs font-medium transition-colors"
            :class="store.contributionMode === 'percent'
              ? 'bg-primary text-primary-contrast'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
          >%</button>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-1">{{ contributionHelperText }}</p>
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="pre-retire-growth-input"
      >Growth Rate (Before Withdrawals)</label>
      <InputNumber
      v-model.number="store.growthRatePreRetirement"
      inputId="pre-retire-growth-input"
      size="small"
      suffix="%"
      :min="0"
      :max="12"
      :step="0.25"
      />
    </div>
  </div>
</template>
