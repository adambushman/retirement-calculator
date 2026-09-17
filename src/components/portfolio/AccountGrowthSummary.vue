<script setup lang="ts">
import { inject } from 'vue';
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
// the target age itself (fixed 59.5 for Traditional/Roth, the Brokerage
// slider below its own KPI). All figures here come from the naive
// per-account projection, independent of Withdrawal Start Age and everything
// the chart/stage breakdown further down the page are built on.
</script>

<template>
  <AccountSectionHeader title="Potential">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
      <div>
        <h2 class="text-lg lg:text-2xl font-bold">{{ dollars(store.currentBalance) }}</h2>
        <p class="text-xs lg:text-sm text-gray-500">Balance Today</p>
      </div>

      <div>
        <h2 class="text-lg lg:text-2xl font-bold">{{ dollars(store.naiveBalanceAtTargetAge) }}</h2>
        <p class="text-xs lg:text-sm text-gray-500">Balance at Age {{ age(store.naiveTargetAge) }}</p>

        <div v-if="store.accountType === 'brokerage'" class="mt-3 max-w-[220px] mx-auto">
          <label class="block text-xs mb-2 text-gray-400" for="naive-withdrawal-age-input">
            Naive Withdrawal Age &mdash; {{ age(store.naiveWithdrawalAge) }}
          </label>
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

      <div>
        <h2 class="text-lg lg:text-2xl font-bold">{{ dollars(store.naiveMonthlyWithdrawal) }}</h2>
        <p class="text-xs lg:text-sm text-gray-500">Monthly Retirement Withdrawals</p>
      </div>
    </div>
  </AccountSectionHeader>
</template>
