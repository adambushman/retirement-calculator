<script setup lang="ts">
import { computed, inject } from 'vue';
import { format } from 'd3-format';

import AccountSectionHeader from '@/components/AccountSectionHeader.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';

const store = inject(AccountStoreKey)!;

const dollars = format('$,.0f');
const percent = format('.2~f');

const accountTypeLabels: Record<string, string> = {
  traditional: 'Traditional',
  roth: 'Roth',
  brokerage: 'Brokerage',
};
const accountTypeLabel = computed(() => accountTypeLabels[store.accountType] ?? store.accountType);

const contributionRateLabel = computed(() =>
  store.contributionMode === 'dollar'
    ? `${dollars(store.contributionAmount)}/mo`
    : `${percent(store.savingsRate)}%`
);

const accountDetailsRows = computed(() => [
  { label: 'Account Type', value: accountTypeLabel.value },
  { label: 'Owner', value: store.ownerName || 'Unassigned' },
]);

const earningSavingRows = computed(() => [
  { label: 'Account Balance Today', value: dollars(store.currentBalance) },
  { label: 'Savings/Contribution Rate', value: contributionRateLabel.value },
  { label: 'Growth Rate (Pre-Retirement)', value: `${percent(store.growthRatePreRetirement)}%` },
]);

const retirementPlanRows = computed(() => [
  { label: 'Withdrawal Start Age', value: String(store.withdrawalStartAge) },
  { label: 'Withdrawal Share', value: `${percent(store.withdrawalShare)}%` },
  { label: 'Growth Rate (Intra-Retirement)', value: `${percent(store.growthRateIntraRetirement)}%` },
]);

const columns = computed(() => [
  { title: 'Account Details', rows: accountDetailsRows.value },
  { title: 'Earning & Saving', rows: earningSavingRows.value },
  { title: 'Retirement Plan', rows: retirementPlanRows.value },
]);
</script>

<template>
  <AccountSectionHeader title="Inputs">
    <div class="grid gap-10 sm:grid-cols-3">
      <div v-for="column in columns" :key="column.title">
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">{{ column.title }}</h4>
        <table class="w-full text-sm border-collapse">
          <tbody>
            <tr v-for="row in column.rows" :key="row.label" class="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td class="py-1.5 pr-2 text-gray-400 align-top">{{ row.label }}</td>
              <td class="py-1.5 font-medium text-right">{{ row.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AccountSectionHeader>
</template>
