<script setup lang="ts">
import { computed, inject } from 'vue';
import { format } from 'd3-format';

import AccountSectionHeader from '@/components/AccountSectionHeader.vue';
import Slider from '@/volt/Slider.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';

const store = inject(AccountStoreKey)!;

// 3 significant digits with an SI prefix (K/M) — these KPIs are meant to give
// a quick sense of scale, not exact-to-the-cent figures.
const dollars = format('$.3~s');
const age = format('.1~f');

// Expands the "$X today -> $Y by [target age]" line shown under the account
// title (collapsed view) — see naiveTargetAge on the store for what drives
// the target age itself (fixed 59.5 for Traditional/Roth, the slider below
// for Brokerage). All figures here come from the naive per-account
// projection, independent of Withdrawal Start Age and everything the chart/
// stage breakdown further down the page are built on.
const kpis = computed(() => [
  { label: 'Balance Today', value: store.currentBalance },
  { label: `Balance at Age ${age(store.naiveTargetAge)}`, value: store.naiveBalanceAtTargetAge },
  { label: 'Monthly Retirement Withdrawals', value: store.naiveMonthlyWithdrawal },
]);
</script>

<template>
  <AccountSectionHeader title="Potential">
    <div v-if="store.accountType === 'brokerage'" class="mb-6">
      <label class="block text-sm mb-2 text-gray-400" for="naive-withdrawal-age-input">
        Naive Withdrawal Age &mdash; {{ age(store.naiveWithdrawalAge) }}
      </label>
      <Slider
        v-model.number="store.naiveWithdrawalAge"
        class="w-full max-w-sm mt-0"
        inputId="naive-withdrawal-age-input"
        :min="store.naiveWithdrawalAgeBounds.min"
        :max="store.naiveWithdrawalAgeBounds.max"
        :step="0.5"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
      <div v-for="kpi in kpis" :key="kpi.label">
        <h2 class="text-lg lg:text-2xl font-bold">{{ dollars(kpi.value) }}</h2>
        <p class="text-xs lg:text-sm text-gray-500">{{ kpi.label }}</p>
      </div>
    </div>
  </AccountSectionHeader>
</template>
