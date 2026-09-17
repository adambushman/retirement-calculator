<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'd3-format';

import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore, type AccountType } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';
import { balanceAtAge } from '@/composeables/useProjections';
import CoinIcon from '@/components/icons/CoinIcon.vue';

const portfolio = usePortfolioStore();

// Independent of any single account's own "Adjust for Inflation" choice (see
// useAccountStore's inflationAdjChoice) — this toggle governs this table
// only, so "Balance at Future Age" is read fresh from each account's own
// futureProjection under this externally chosen perspective rather than
// whatever that account's own toggle happens to be set to (mirrors
// usePortfolioProjection's convention for the chart/stage breakdown).
const inflationAdjusted = ref(false);
const perspective = computed<'raw' | 'inflation-adjusted'>(() =>
  inflationAdjusted.value ? 'inflation-adjusted' : 'raw'
);

const accountStores = computed(() =>
  portfolio.accounts.map((a) => useAccountStore(a.id))
);

function balanceAtWithdrawalStartFor(store: ReturnType<typeof useAccountStore>): number {
  return balanceAtAge(
    store.futureProjection[perspective.value],
    store.ageToday,
    store.withdrawalStartAge,
    store.currentBalance
  );
}

const totalCurrentBalance = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.currentBalance, 0)
);

const totalMonthlyContribution = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.firstMonthlyContribution, 0)
);

const totalBalanceAtWithdrawalStart = computed(() =>
  accountStores.value.reduce((sum, s) => sum + balanceAtWithdrawalStartFor(s), 0)
);

const ACCOUNT_TYPE_ORDER: AccountType[] = ['traditional', 'roth', 'brokerage'];

// One column per account type that's actually in use, rolling every account
// of that type into a single bucket — a first cut at "the portfolio by type"
// that can grow to cover more than these three figures later.
const buckets = computed(() => {
  return ACCOUNT_TYPE_ORDER.map((type) => {
    const stores = accountStores.value.filter((s) => s.accountType === type);
    const balanceToday = stores.reduce((sum, s) => sum + s.currentBalance, 0);
    const balanceAtWithdrawalStart = stores.reduce((sum, s) => sum + balanceAtWithdrawalStartFor(s), 0);
    const monthlyContribution = stores.reduce((sum, s) => sum + s.firstMonthlyContribution, 0);

    return {
      type,
      label: ACCOUNT_TYPE_LABELS[type],
      icon: ACCOUNT_TYPE_ICONS[type],
      accountCount: stores.length,
      monthlyContribution,
      percentOfContributionTotal:
        totalMonthlyContribution.value > 0 ? (monthlyContribution / totalMonthlyContribution.value) * 100 : 0,
      balanceToday,
      percentOfTotal: totalCurrentBalance.value > 0 ? (balanceToday / totalCurrentBalance.value) * 100 : 0,
      balanceAtWithdrawalStart,
      percentOfWithdrawalTotal:
        totalBalanceAtWithdrawalStart.value > 0
          ? (balanceAtWithdrawalStart / totalBalanceAtWithdrawalStart.value) * 100
          : 0,
    };
  }).filter((bucket) => bucket.balanceToday > 0 || bucket.balanceAtWithdrawalStart > 0);
});

// A trailing "Combined" column rolling up every bucket into the portfolio's
// totals, so the table always shows the whole picture alongside the by-type
// breakdown.
const columns = computed(() => [
  ...buckets.value,
  {
    type: 'combined' as const,
    label: 'Combined',
    icon: CoinIcon,
    accountCount: accountStores.value.length,
    monthlyContribution: totalMonthlyContribution.value,
    percentOfContributionTotal: 100,
    balanceToday: totalCurrentBalance.value,
    percentOfTotal: 100,
    balanceAtWithdrawalStart: totalBalanceAtWithdrawalStart.value,
    percentOfWithdrawalTotal: 100,
  },
]);

const dollars = format('$.3~s');
const percent = format('.1f');
</script>

<template>
  <div v-if="portfolio.accounts.length">
    <div class="flex justify-end items-center gap-2 mb-5">
      <span class="text-xs lg:text-sm text-gray-400">Adjust for Inflation</span>
      <ToggleSwitch v-model="inflationAdjusted" />
    </div>

    <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr>
          <th></th>
          <th
            v-for="column in columns"
            :key="column.type"
            class="pb-3 px-3"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700'"
          >
            <div class="flex flex-col items-center gap-1.5">
              <component :is="column.icon" class="text-primary" style="width: 22px; height: 22px" />
              <span class="font-semibold">{{ column.label }}</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Number of Accounts</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ column.accountCount }}
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Total Monthly Contribution</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ dollars(column.monthlyContribution) }}
            <span v-if="column.type !== 'combined'" class="block text-xs font-normal text-gray-400">
              {{ percent(column.percentOfContributionTotal) }}%
            </span>
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Balance Today</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ dollars(column.balanceToday) }}
            <span v-if="column.type !== 'combined'" class="block text-xs font-normal text-gray-400">
              {{ percent(column.percentOfTotal) }}%
            </span>
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Balance at Future Age</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ dollars(column.balanceAtWithdrawalStart) }}
            <span v-if="column.type !== 'combined'" class="block text-xs font-normal text-gray-400">
              {{ percent(column.percentOfWithdrawalTotal) }}%
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>
