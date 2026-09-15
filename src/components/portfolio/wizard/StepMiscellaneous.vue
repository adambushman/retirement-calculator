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
      for="annual-inflation-input"
      >Annual Inflation</label>
      <InputNumber
      v-model.number="store.annualInflation"
      inputId="annual-inflation-input"
      size="small"
      suffix="%"
      :min="0"
      :max="6"
      :step="0.25"
      />
    </div>
  </div>
</template>
