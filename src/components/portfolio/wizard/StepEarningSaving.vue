<script setup lang="ts">
import { inject } from 'vue';

import InputNumber from '@/volt/InputNumber.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';

const store = inject(AccountStoreKey)!;
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <div>
      <label
      class="block text-sm mb-1 text-gray-400"
      for="annual-income-input"
      >Annual Income Today (Gross)</label>
      <InputNumber
      v-model.number="store.annualIncome"
      inputId="annual-income-input"
      size="small"
      prefix="$"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="annual-raises-input"
      >Annual Raises</label>
      <InputNumber
      v-model.number="store.annualRaises"
      inputId="annual-raises-input"
      size="small"
      suffix="%"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="age-today-input"
      >Your Age Today</label>
      <InputNumber
      v-model.number="store.ageToday"
      inputId="age-today-input"
      size="small"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="current-balance-input"
      >Investment Balance Today</label>
      <InputNumber
      v-model.number="store.currentBalance"
      inputId="current-balance-input"
      size="small"
      prefix="$"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="savings-rate-input"
      >Savings/Contribution Rate</label>
      <InputNumber
      v-model.number="store.savingsRate"
      inputId="savings-rate-input"
      size="small"
      suffix="%"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="pre-retire-growth-input"
      >Growth Rate (Pre-Retirement)</label>
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
