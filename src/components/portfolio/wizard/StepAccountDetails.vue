<script setup lang="ts">
import { inject } from 'vue';

import { AccountStoreKey } from '@/stores/accountStoreKey';
import type { AccountType } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';

const name = defineModel<string>('name', { default: '' });

const store = inject(AccountStoreKey)!;

const accountTypes: Array<{ value: AccountType; label: string; description: string }> = [
  { value: 'traditional', label: 'Traditional', description: 'Pre-tax contributions' },
  { value: 'roth', label: 'Roth', description: 'After-tax contributions' },
  { value: 'brokerage', label: 'Brokerage', description: 'Taxable funds' },
];
</script>

<template>
  <div class="space-y-6">
    <div>
      <label class="block text-sm mb-2 text-gray-400">Account Type</label>
      <div class="grid gap-2 sm:grid-cols-3">
        <label
          v-for="type in accountTypes"
          :key="type.value"
          class="flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors"
          :class="store.accountType === type.value
            ? 'border-primary bg-primary-50 dark:bg-primary/10'
            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
        >
          <input
            type="radio"
            name="account-type"
            :value="type.value"
            v-model="store.accountType"
            class="mt-1 accent-primary"
          />
          <component :is="ACCOUNT_TYPE_ICONS[type.value]" class="mt-0.5 shrink-0" style="width: 16px; height: 16px" />
          <span>
            <span class="block text-sm font-medium">{{ type.label }}</span>
            <span class="block text-xs text-gray-400">{{ type.description }}</span>
          </span>
        </label>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-6">
      <div class="flex-1 min-w-0">
        <label class="block text-sm mb-2 text-gray-400" for="account-name-input">Account Name</label>
        <input
          id="account-name-input"
          v-model="name"
          type="text"
          class="rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950
            px-3 py-1.5 text-sm w-full outline-none focus-visible:outline focus-visible:outline-1
            focus-visible:outline-primary"
        />
      </div>

      <div class="flex-1 min-w-0">
        <label class="block text-sm mb-2 text-gray-400" for="account-owner-input">Account Owner</label>
        <input
          id="account-owner-input"
          v-model="store.ownerName"
          type="text"
          class="rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950
            px-3 py-1.5 text-sm w-full outline-none focus-visible:outline focus-visible:outline-1
            focus-visible:outline-primary"
        />
      </div>
    </div>
  </div>
</template>
