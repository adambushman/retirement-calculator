<script setup lang="ts">
import { computed, inject } from 'vue';
import { format } from 'd3-format';

import Slider from '@/volt/Slider.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';
import type { AccountType } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';

const age = format('.1~f');

const name = defineModel<string>('name', { default: '' });

const store = inject(AccountStoreKey)!;

const accountTypes: Array<{ value: AccountType; label: string; description: string }> = [
  { value: 'traditional', label: 'Traditional', description: 'Pre-tax contributions' },
  { value: 'roth', label: 'Roth', description: 'After-tax contributions' },
  { value: 'brokerage', label: 'Brokerage', description: 'Taxable funds' },
];

// Where the handle sits along the track, as a percent — used to float the
// value label directly above it, same convention as the Growth Rate slider
// (see StepEarningSaving.vue) and the naive withdrawal age slider in
// AccountGrowthSummary.vue.
const naiveWithdrawalAgePercent = computed(() => {
  const { min, max } = store.naiveWithdrawalAgeBounds;
  return ((store.naiveWithdrawalAge - min) / (max - min)) * 100;
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <label class="block text-sm mb-2 text-gray-400">Account Type</label>
      <div class="grid gap-2 sm:grid-cols-3">
        <label
          v-for="type in accountTypes"
          :key="type.value"
          class="flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors"
          :class="store.accountType === type.value
            ? 'border-primary bg-primary-50 dark:bg-primary/10'
            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
        >
          <input
            type="radio"
            name="account-type"
            :value="type.value"
            v-model="store.accountType"
            class="mt-1 accent-primary"
          />
          <component :is="ACCOUNT_TYPE_ICONS[type.value]" class="mt-0.5 shrink-0" style="width: 16px; height: 16px" />
          <span>
            <span class="block text-sm font-medium">{{ type.label }}</span>
            <span class="block text-xs text-gray-400">{{ type.description }}</span>
          </span>
        </label>
      </div>
    </div>

    <div v-if="store.accountType === 'brokerage'" class="max-w-sm">
      <label class="block text-sm mb-2 text-gray-400" for="naive-withdrawal-age-input">
        Naive Withdrawal Age
      </label>
      <p class="text-xs text-gray-400 mb-2">
        Brokerage accounts have no penalty-free withdrawal age of their own — pick an age to use
        as a rough "what if I started drawing on this" estimate (see the Potential section).
      </p>
      <div class="relative mt-6 pt-6">
        <span
          class="absolute top-0 -translate-x-1/2 leading-none text-sm font-semibold text-primary whitespace-nowrap"
          :style="{ left: `${naiveWithdrawalAgePercent}%` }"
        >
          {{ age(store.naiveWithdrawalAge) }}
        </span>
        <Slider
          v-model.number="store.naiveWithdrawalAge"
          class="w-full mt-0"
          inputId="naive-withdrawal-age-input"
          :min="store.naiveWithdrawalAgeBounds.min"
          :max="store.naiveWithdrawalAgeBounds.max"
          :step="0.5"
        />
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-6">
      <div class="flex-1 min-w-0">
        <label class="block text-sm mb-2 text-gray-400" for="account-name-input">Account Name</label>
        <input
          id="account-name-input"
          v-model="name"
          type="text"
          class="rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950
            px-3 py-1.5 text-sm w-full outline-none focus-visible:outline focus-visible:outline-1
            focus-visible:outline-primary"
        />
      </div>

      <div class="flex-1 min-w-0">
        <label class="block text-sm mb-2 text-gray-400" for="account-owner-input">Account Owner</label>
        <input
          id="account-owner-input"
          v-model="store.ownerName"
          type="text"
          class="rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950
            px-3 py-1.5 text-sm w-full outline-none focus-visible:outline focus-visible:outline-1
            focus-visible:outline-primary"
        />
      </div>
    </div>
  </div>
</template>
