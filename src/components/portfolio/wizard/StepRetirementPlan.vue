<script setup lang="ts">
import { inject } from 'vue';

import InputNumber from '@/volt/InputNumber.vue';
import Slider from '@/volt/Slider.vue';
import SliderLabel from '@/components/SliderLabel.vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';

const store = inject(AccountStoreKey)!;
</script>

<template>
  <div class="flex flex-wrap gap-4">
    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="withdrawal-start-age-input"
      >Withdrawal Start Age</label>
      <InputNumber
      v-model.number="store.withdrawalStartAge"
      inputId="withdrawal-start-age-input"
      size="small"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="intra-retire-growth-input"
      >Growth Rate (Intra-Retirement)</label>
      <InputNumber
      v-model.number="store.growthRateIntraRetirement"
      inputId="intra-retire-growth-input"
      size="small"
      suffix="%"
      :min="0"
      :max="12"
      :step="0.25"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="retire-stages-input"
      >Retirement Stage Length (Yrs)</label>
      <SliderLabel
      :yearsInGoGo="store.yearsInGoGo"
      :yearsInSlowGo="store.yearsInSlowGo"
      :yearsInNoGo="store.yearsInNoGo"
      />
      <Slider
      v-model="store.retirementBoundaries"
      class="w-50 mt-0"
      inputId="retire-stages-input"
      range
      :min="store.withdrawalStartAge"
      :max="store.lifeExpectancy"
      ></Slider>
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="gogo-withdrawal-rate-input"
      >Go-Go Withdrawal Rate</label>
      <InputNumber
      v-model.number="store.incomeReplacementGoGo"
      inputId="gogo-withdrawal-rate-input"
      size="small"
      suffix="%"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="slowgo-withdrawal-rate-input"
      >Slow-Go Withdrawal Rate</label>
      <InputNumber
      v-model.number="store.incomeReplacementSlowGo"
      inputId="slowgo-withdrawal-rate-input"
      size="small"
      suffix="%"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="nogo-withdrawal-rate-input"
      >No-Go Withdrawal Rate</label>
      <InputNumber
      v-model.number="store.incomeReplacementNoGo"
      inputId="nogo-withdrawal-rate-input"
      size="small"
      suffix="%"
      />
    </div>
  </div>
</template>
