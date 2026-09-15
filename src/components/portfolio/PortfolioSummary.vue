<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'd3-format';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioCoverage } from '@/composeables/usePortfolioCoverage';
import { STAGE_BRIDGE, STAGE_COLORS } from '@/composeables/useStages';

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

const { bridgeStartAge, stageCoverage } = usePortfolioCoverage();

// Hide the Bridge row entirely when no account actually withdraws early —
// showing "Bridge: 0% covered" for a portfolio that isn't using it at all
// would just be noise.
const visibleCoverage = computed(() =>
  stageCoverage.value.filter((c) => c.stage !== STAGE_BRIDGE || bridgeStartAge.value !== null)
);
</script>

<template>
  <div v-if="portfolio.accounts.length" class="mb-6">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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

    <div v-if="visibleCoverage.length" class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-4">
      <span v-for="c in visibleCoverage" :key="c.stage" class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: STAGE_COLORS[c.stage] }" />
        {{ c.stage }}: {{ Math.round(c.coveragePercent) }}% covered
      </span>
    </div>
  </div>
</template>
