<script setup lang="ts">
import { computed, inject } from 'vue';
import { format } from 'd3-format';

import AccountSectionHeader from '@/components/AccountSectionHeader.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';
import { ACCOUNT_TYPE_LABELS } from '@/composeables/useAccountTypes';

const store = inject(AccountStoreKey)!;

const dollars = format('$,.0f');
const percent = format('.2~f');

const accountTypeLabel = computed(() => ACCOUNT_TYPE_LABELS[store.accountType] ?? store.accountType);

const contributionRateLabel = computed(() =>
  store.contributionMode === 'dollar'
    ? `${dollars(store.contributionAmount)}/mo`
    : `${percent(store.savingsRate)}%`
);

// Which income the percent-of-income rate is measured against, shown only
// in percent mode — a flat dollar contribution isn't tied to any stream.
const contributionSourceLabel = computed(() => {
  if (store.contributionMode !== 'percent') return null;
  return store.referencedIncomeStream?.name ?? 'Total Annual Income';
});

const accountDetailsRows = computed(() => [
  { label: 'Account Type', value: accountTypeLabel.value },
  { label: 'Account Owner', value: store.ownerName || 'Unassigned' },
]);

// Withdrawal Start Age, Withdrawal Share, and Growth Rate (During
// Withdrawals) used to live here as a third "Retirement Plan" column, but
// that's retirement-phase config, and this card is about the account before
// any of that is relevant — so those fields now live in the portfolio-wide
// Retirement Plan section instead (see RetirementPlanInputs.vue), listed per
// account.
const columns = computed(() => [
  { title: 'Account Details', rows: accountDetailsRows.value },
]);
</script>

<template>
  <AccountSectionHeader title="Assumptions">
    <div class="grid gap-10 sm:grid-cols-2">
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

      <div>
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Earning &amp; Saving</h4>
        <table class="w-full text-sm border-collapse">
          <tbody>
            <tr class="border-b border-surface-100 dark:border-surface-800">
              <td class="py-1.5 pr-2 text-gray-400 align-top">Account Balance Today</td>
              <td class="py-1.5 font-medium text-right">{{ dollars(store.currentBalance) }}</td>
            </tr>
            <tr class="border-b border-surface-100 dark:border-surface-800">
              <td class="py-1.5 pr-2 text-gray-400 align-top">Savings/Contribution Rate</td>
              <td class="py-1.5 font-medium text-right">
                {{ contributionRateLabel }}
                <span
                  v-if="contributionSourceLabel"
                  class="block text-xs font-normal"
                  :class="store.isIncomeStreamMissing ? 'text-amber-500' : 'text-gray-400'"
                  :title="store.isIncomeStreamMissing
                    ? 'Previously selected income was removed — using Total for now.'
                    : undefined"
                >
                  of {{ contributionSourceLabel }}
                </span>
              </td>
            </tr>
            <tr class="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td class="py-1.5 pr-2 text-gray-400 align-top">Growth Rate (Before Withdrawals)</td>
              <td class="py-1.5 font-medium text-right">{{ percent(store.growthRatePreRetirement) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AccountSectionHeader>
</template>
