<script setup lang="ts">
import { format } from 'd3-format';

import IconToolTip from '@/components/IconToolTip.vue';

defineProps<{
  name: string,
  color: string,
  description: string,
  finalBalance: number,
  totalFlow: number,
  avgMonthlyFlow: number,
  totalGrowth: number,
  years: Array<number>,
  /** Accumulation is the only stage money flows *into* the accounts; every other stage is withdrawals, even if guaranteed income covers it and that comes to $0. */
  isAccumulation?: boolean,
  /** Average monthly guaranteed income (Social Security, pensions, annuities) during this stage; hidden when 0. */
  avgMonthlyIncome?: number
}>();
</script>

<template>
<div class="flex flex-col items-center space-y-4">
  <div class="text-center space-y-1">
    <h3
    :style="{ borderColor: color }"
    class="text-sm lg:text-md border border-2 ps-3 pe-6 py-1 rounded-lg relative"
    >
      {{ name }}
      <div class="absolute top-0 right-2" >
        <IconToolTip position="top">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16">
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
            </svg>
          </template>

          {{ description }}
        </IconToolTip>
      </div>
    </h3>
    <p class="alt text-xs lg:text-sm">Age {{ years[0] + ' - ' + years[1] }} </p>
  </div>

  <div class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(finalBalance) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">End Balance</p>
  </div>

  <div class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(totalFlow) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">{{ isAccumulation ? 'Contributions' : 'Withdrawals' }}</p>
  </div>

  <div class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(avgMonthlyFlow) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">Monthly Avg.</p>
  </div>

  <div class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(totalGrowth) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">Compounded Growth</p>
  </div>

  <div v-if="avgMonthlyIncome" class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(avgMonthlyIncome) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">Guaranteed Income (Monthly Avg.)</p>
  </div>
</div>
</template>

<style scoped>
.alt {
  color: var(--p-text-muted-color);
}
</style>
