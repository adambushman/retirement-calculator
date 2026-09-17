<script setup lang="ts">
import { computed, inject } from 'vue';
import { format } from 'd3-format';

import AccountSectionHeader from '@/components/AccountSectionHeader.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';

const store = inject(AccountStoreKey)!;

// 3 significant digits with an SI prefix (K/M) — these KPIs are meant to give
// a quick sense of scale, not exact-to-the-cent figures.
const dollars = format('$.3~s');

// Expands the "$X today -> $Y at end of plan" line shown under the account
// title (collapsed view) into the accumulation-phase story specifically:
// starting balance, ending balance at the point withdrawals begin, and how
// much of that increase came from contributions vs. growth.
const kpis = computed(() => [
  { label: 'Balance Today', value: store.currentBalance },
  { label: 'Balance at Withdrawal Start Age', value: store.balanceAtWithdrawalStart },
  { label: 'Dollars You Contributed', value: store.totalPreRetirementFlow },
  { label: 'Dollars of Growth', value: store.growthToWithdrawalStart },
]);
</script>

<template>
  <AccountSectionHeader title="Potential">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
      <div v-for="kpi in kpis" :key="kpi.label">
        <h2 class="text-lg lg:text-2xl font-bold">{{ dollars(kpi.value) }}</h2>
        <p class="text-xs lg:text-sm text-gray-500">{{ kpi.label }}</p>
      </div>
    </div>
  </AccountSectionHeader>
</template>
