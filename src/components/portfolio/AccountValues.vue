<script setup lang="ts">
import { computed, inject } from 'vue';
import { format } from 'd3-format';

import SectionHeader from '@/components/SectionHeader.vue';
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
</script>

<template>
  <div>
    <SectionHeader>Inputs</SectionHeader>

    <div class="space-y-5">
      <div>
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Account Details</h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <div>
            <p class="text-sm text-gray-400">Account Type</p>
            <p class="font-medium">{{ accountTypeLabel }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Owner</p>
            <p class="font-medium">{{ store.ownerName || 'Unassigned' }}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Earning & Saving</h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <div>
            <p class="text-sm text-gray-400">Account Balance Today</p>
            <p class="font-medium">{{ dollars(store.currentBalance) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Savings/Contribution Rate</p>
            <p class="font-medium">
              {{ store.contributionMode === 'dollar' ? `${dollars(store.contributionAmount)}/mo` : `${percent(store.savingsRate)}%` }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Growth Rate (Pre-Retirement)</p>
            <p class="font-medium">{{ percent(store.growthRatePreRetirement) }}%</p>
          </div>
        </div>
      </div>

      <div>
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Retirement Plan</h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <div>
            <p class="text-sm text-gray-400">Withdrawal Start Age</p>
            <p class="font-medium">{{ store.withdrawalStartAge }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Growth Rate (Intra-Retirement)</p>
            <p class="font-medium">{{ percent(store.growthRateIntraRetirement) }}%</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Stage Length (Go/Slow/No-Go)</p>
            <p class="font-medium">
              {{ store.yearsInGoGo }} / {{ store.yearsInSlowGo }} / {{ store.yearsInNoGo }} yrs
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Go-Go Withdrawal Rate</p>
            <p class="font-medium">{{ percent(store.incomeReplacementGoGo) }}%</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Slow-Go Withdrawal Rate</p>
            <p class="font-medium">{{ percent(store.incomeReplacementSlowGo) }}%</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">No-Go Withdrawal Rate</p>
            <p class="font-medium">{{ percent(store.incomeReplacementNoGo) }}%</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
