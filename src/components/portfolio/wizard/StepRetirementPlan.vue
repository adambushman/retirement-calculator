<script setup lang="ts">
import { inject } from 'vue';

import InputNumber from '@/volt/InputNumber.vue';
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
      :min="store.withdrawalStartAgeBounds.min"
      :max="store.withdrawalStartAgeBounds.max"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="withdrawal-share-input"
      >Withdrawal Share</label>
      <InputNumber
      v-model.number="store.withdrawalShare"
      inputId="withdrawal-share-input"
      size="small"
      suffix="%"
      :min="0"
      :max="100"
      />
    </div>

    <div>
      <label
      class="block text-sm mb-2 text-gray-400"
      for="intra-retire-growth-input"
      >Growth Rate (During Withdrawals)</label>
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
  </div>
</template>
