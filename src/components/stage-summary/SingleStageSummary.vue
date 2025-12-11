<script setup lang="ts">
import { format } from 'd3-format';

import IconToolTip from '@/components/IconToolTip.vue';

const props = defineProps<{
  stage: 'Pre-Retirement' | 'Go-Go Years' | 'Slow-Go Years' | 'No-Go Years',
  finalBalance: number,
  totalFlow: number,
  totalGrowth: number
}>();

const stageClass = {
  'Pre-Retirement': 'border-red-400',
  'Go-Go Years': 'border-blue-400',
  'Slow-Go Years': 'border-teal-300',
  'No-Go Years': 'border-yellow-400'
};

const stageDescription = {
  'Pre-Retirement': 'Active working years when you\'re building savings and preparing financially for retirement.',
  'Go-Go Years': 'The early stage of retirement when you\'re healthiest, most active, and typically spending more on travel and lifestyle.',
  'Slow-Go Years': 'The middle stage of retirement when activity levels naturally decline and spending begins to moderate.',
  'No-Go Years': 'The late stage of retirement marked by reduced mobility, increased rest, and higher healthcare-related expenses.'
}
</script>

<template>
  <div class="flex flex-col items-center space-y-3">
  <h3
  :class="stageClass[stage]"
  class="text-md lg:text-md border border-2 ps-3 pe-6 py-1 rounded-lg relative"
  >
    {{ stage }}
    <div class="absolute top-0 right-2" >
      <IconToolTip position="top">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16">
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
          </svg>
        </template>

        {{ stageDescription[stage] }}
      </IconToolTip>
    </div>
  </h3>

  <div class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(finalBalance) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">End Balance</p>
  </div>

  <div class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(totalFlow) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">{{ totalFlow < 0 ? 'Withdrawals' : 'Contributions' }}</p>
  </div>

  <div class="text-center">
    <h2 class="text-sm lg:text-lg font-bold">{{ format("$,.2f")(totalGrowth) }}</h2>
    <p class="text-xs lg:text-sm text-gray-500">Compounded Growth</p>
  </div>
</div>
</template>