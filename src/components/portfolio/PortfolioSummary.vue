<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'd3-format';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore, type AccountType } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';
import CoinIcon from '@/components/icons/CoinIcon.vue';

const portfolio = usePortfolioStore();

const accountStores = computed(() =>
  portfolio.accounts.map((a) => useAccountStore(a.id))
);

const totalCurrentBalance = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.currentBalance, 0)
);

const totalBalanceAtWithdrawalStart = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.balanceAtWithdrawalStart, 0)
);

const ACCOUNT_TYPE_ORDER: AccountType[] = ['traditional', 'roth', 'brokerage'];

// One column per account type that's actually in use, rolling every account
// of that type into a single bucket — a first cut at "the portfolio by type"
// that can grow to cover more than these three figures later.
const buckets = computed(() => {
  return ACCOUNT_TYPE_ORDER.map((type) => {
    const stores = accountStores.value.filter((s) => s.accountType === type);
    const balanceToday = stores.reduce((sum, s) => sum + s.currentBalance, 0);
    const balanceAtWithdrawalStart = stores.reduce((sum, s) => sum + s.balanceAtWithdrawalStart, 0);

    return {
      type,
      label: ACCOUNT_TYPE_LABELS[type],
      icon: ACCOUNT_TYPE_ICONS[type],
      balanceToday,
      percentOfTotal: totalCurrentBalance.value > 0 ? (balanceToday / totalCurrentBalance.value) * 100 : 0,
      balanceAtWithdrawalStart,
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
    balanceToday: totalCurrentBalance.value,
    percentOfTotal: 100,
    balanceAtWithdrawalStart: totalBalanceAtWithdrawalStart.value,
  },
]);

const dollars = format('$.3~s');
const percent = format('.1f');
</script>

<template>
  <div v-if="portfolio.accounts.length" class="overflow-x-auto">
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
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Balance Today</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ dollars(column.balanceToday) }}
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Of Portfolio</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ percent(column.percentOfTotal) }}%
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">At First Withdrawal</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ dollars(column.balanceAtWithdrawalStart) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
