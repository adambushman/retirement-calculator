<script setup lang="ts">
import { inject } from 'vue';
import { format } from 'd3-format';

import SectionHeader from '@/components/SectionHeader.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';

const store = inject(AccountStoreKey)!;

const dollars = format('$,.0f');
const percent = format('.2~f');
</script>

<template>
  <div>
    <SectionHeader>Inputs</SectionHeader>

    <div class="space-y-5">
      <div>
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Earning & Saving</h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <div>
            <p class="text-sm text-gray-400">Annual Income Today (Gross)</p>
            <p class="font-medium">{{ dollars(store.annualIncome) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Annual Raises</p>
            <p class="font-medium">{{ percent(store.annualRaises) }}%</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Your Age Today</p>
            <p class="font-medium">{{ store.ageToday }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Investment Balance Today</p>
            <p class="font-medium">{{ dollars(store.currentBalance) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Savings/Contribution Rate</p>
            <p class="font-medium">{{ percent(store.savingsRate) }}%</p>
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
            <p class="text-sm text-gray-400">Retirement Age</p>
            <p class="font-medium">{{ store.ageRetirement }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Life Expectancy</p>
            <p class="font-medium">{{ store.lifeExpectancy }}</p>
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

      <div>
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Miscellaneous</h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <div>
            <p class="text-sm text-gray-400">Annual Inflation</p>
            <p class="font-medium">{{ percent(store.annualInflation) }}%</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
