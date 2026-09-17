<script setup lang="ts">
import { computed, inject } from 'vue';

import AccountSectionHeader from '@/components/AccountSectionHeader.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';
import { ACCOUNT_TYPE_RULES } from '@/composeables/useAccountTypes';

const store = inject(AccountStoreKey)!;

const rules = computed(() => ACCOUNT_TYPE_RULES[store.accountType]);

const taxTreatmentRows = computed(() => [
  { label: 'Contributions Taxed', value: rules.value.contributionTaxTreatment },
  { label: 'Withdrawals Taxed', value: rules.value.withdrawalTaxTreatment },
]);

const withdrawalRuleRows = computed(() => [
  {
    label: 'Penalty-Free Withdrawal Age',
    value:
      rules.value.penaltyFreeWithdrawalAge !== null
        ? String(rules.value.penaltyFreeWithdrawalAge)
        : 'None — always accessible',
  },
  {
    label: 'Early Withdrawal Penalty',
    value: rules.value.earlyWithdrawalPenaltyRate !== null ? `${rules.value.earlyWithdrawalPenaltyRate}%` : 'None',
  },
]);

const columns = computed(() => [
  { title: 'Tax Treatment', rows: taxTreatmentRows.value },
  { title: 'Withdrawal Rules', rows: withdrawalRuleRows.value },
]);
</script>

<template>
  <AccountSectionHeader title="Facts">
    <p class="text-sm text-gray-400 mb-4">{{ rules.taxDescription }}</p>
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
    </div>
  </AccountSectionHeader>
</template>
