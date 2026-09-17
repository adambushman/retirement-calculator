<script setup lang="ts">
import { computed, inject } from 'vue';

import InputNumber from '@/volt/InputNumber.vue';
import InputGroup from '@/volt/InputGroup.vue';
import InputGroupAddon from '@/volt/InputGroupAddon.vue';
import Select from '@/volt/Select.vue';
import Slider from '@/volt/Slider.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { format } from 'd3-format';

const store = inject(AccountStoreKey)!;
const assumptions = usePortfolioAssumptionsStore();

const dollars = format('$,.0f');
const percent = format('.1~f');

// Historical 15-year rolling S&P 500 returns: the 10th percentile is ~5.5%,
// the 90th ~16.5% — bounding the slider to that range keeps the assumption
// grounded rather than open to an arbitrary guess. The store's own default
// (8.5%) sits inside it, close to the historical median.
const GROWTH_RATE_MIN = 5.5;
const GROWTH_RATE_MAX = 16.5;

// Always shown in percent mode, even with just the household default — it's
// part of the same control now, and "Total" is a real (if only) choice, not
// a placeholder. Only becomes a real decision once a second stream exists;
// see streamOptions/hasMultipleStreams.
const showIncomeStreamPicker = computed(() => store.contributionMode === 'percent');

const hasMultipleStreams = computed(() => assumptions.incomeStreams.length > 1);

// PrimeVue Select can't tell "nothing selected" apart from "selected the
// option whose value is null" — both look empty internally — so the "Total"
// option needs a real sentinel value, translated back to store.incomeStreamId
// (string | null) by incomeStreamSelection below.
const TOTAL_INCOME_VALUE = '__total__';

const streamOptions = computed(() => [
  { label: 'Total Annual Income', value: TOTAL_INCOME_VALUE },
  ...(hasMultipleStreams.value ? assumptions.incomeStreams.map((s) => ({ label: s.name, value: s.id })) : []),
]);

const incomeStreamSelection = computed<string>({
  get: () => store.incomeStreamId ?? TOTAL_INCOME_VALUE,
  set: (value) => { store.incomeStreamId = value === TOTAL_INCOME_VALUE ? null : value; },
});

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

// Where the handle sits along the track, as a percent — used to float the
// value label directly above it, same convention as the Brokerage naive
// withdrawal age slider (see AccountGrowthSummary.vue).
const growthRatePercent = computed(
  () => ((store.growthRatePreRetirement - GROWTH_RATE_MIN) / (GROWTH_RATE_MAX - GROWTH_RATE_MIN)) * 100
);
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

    <div :class="showIncomeStreamPicker ? 'w-full sm:w-80' : ''">
      <label class="block text-sm mb-2 text-gray-400" for="contribution-input">Savings/Contribution Rate</label>
      <InputGroup>
        <InputNumber
          v-model.number="contributionValue"
          inputId="contribution-input"
          size="small"
          class="w-20"
          :prefix="store.contributionMode === 'dollar' ? '$' : undefined"
          :suffix="store.contributionMode === 'percent' ? '%' : undefined"
        />
        <InputGroupAddon class="gap-1">
          <button
            type="button"
            aria-label="Flat dollar amount"
            @click="store.setContributionMode('dollar')"
            class="w-6 h-6 rounded text-xs font-medium transition-colors"
            :class="store.contributionMode === 'dollar'
              ? 'bg-primary text-primary-contrast'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
          >$</button>
          <button
            type="button"
            aria-label="Percent of income"
            @click="store.setContributionMode('percent')"
            class="w-6 h-6 rounded text-xs font-medium transition-colors"
            :class="store.contributionMode === 'percent'
              ? 'bg-primary text-primary-contrast'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
          >%</button>
        </InputGroupAddon>
        <template v-if="showIncomeStreamPicker">
          <InputGroupAddon>of</InputGroupAddon>
          <Select
            v-model="incomeStreamSelection"
            :options="streamOptions"
            optionLabel="label"
            optionValue="value"
            size="small"
            class="flex-1 min-w-0"
            aria-label="Based on income stream"
            :disabled="!hasMultipleStreams && !store.isIncomeStreamMissing"
          />
        </template>
      </InputGroup>
      <p class="text-xs text-gray-400 mt-1">{{ contributionHelperText }}</p>
      <p v-if="store.isIncomeStreamMissing" class="text-xs text-amber-500 mt-1">
        Previously selected income was removed — using Total for now.
      </p>
    </div>

    <div class="w-full sm:w-64">
      <label class="block text-sm mb-2 text-gray-400" for="pre-retire-growth-input">
        Growth Rate (Before Withdrawals)
      </label>
      <div class="relative mt-6 pt-6">
        <span
          class="absolute top-0 -translate-x-1/2 leading-none text-sm font-semibold text-primary whitespace-nowrap"
          :style="{ left: `${growthRatePercent}%` }"
        >
          {{ percent(store.growthRatePreRetirement) }}%
        </span>
        <Slider
          v-model.number="store.growthRatePreRetirement"
          class="w-full mt-0"
          inputId="pre-retire-growth-input"
          :min="GROWTH_RATE_MIN"
          :max="GROWTH_RATE_MAX"
          :step="0.5"
        />
      </div>
    </div>
  </div>
</template>
