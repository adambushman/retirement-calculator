<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'd3-format';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';

const portfolio = usePortfolioStore();

// Scalar roll-up across every account's own store. Accounts can have
// different age timelines, so this intentionally stops at simple sums rather
// than trying to merge each account's year-by-year projection into one chart.
const accountStores = computed(() =>
  portfolio.accounts.map((a) => useAccountStore(a.id))
);

const totalCurrentBalance = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.currentBalance, 0)
);

const totalProjectedBalance = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.finalNoGoBalance, 0)
);

const totalAvgMonthlyWithdrawal = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.avgMonthlyWithdrawal, 0)
);
</script>

<template>
  <div
    v-if="portfolio.accounts.length"
    class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-center"
  >
    <div>
      <h2 class="text-lg lg:text-2xl font-bold">{{ portfolio.accounts.length }}</h2>
      <p class="text-xs lg:text-sm text-gray-500">
        {{ portfolio.accounts.length === 1 ? 'Account' : 'Accounts' }}
      </p>
    </div>

    <div>
      <h2 class="text-lg lg:text-2xl font-bold">{{ format('$,.2f')(totalCurrentBalance) }}</h2>
      <p class="text-xs lg:text-sm text-gray-500">Total Balance Today</p>
    </div>

    <div>
      <h2
        class="text-lg lg:text-2xl font-bold"
        :class="totalProjectedBalance < 0 ? 'text-red-500' : ''"
      >
        {{ format('$,.2f')(totalProjectedBalance) }}
      </h2>
      <p class="text-xs lg:text-sm text-gray-500">Projected Balance, End of Plan</p>
    </div>

    <div>
      <h2 class="text-lg lg:text-2xl font-bold">{{ format('$,.2f')(totalAvgMonthlyWithdrawal * -1) }}</h2>
      <p class="text-xs lg:text-sm text-gray-500">Avg. Monthly Withdrawal</p>
    </div>
  </div>
</template>
