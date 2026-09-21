<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import PlusIcon from '@primevue/icons/plus';

import SecondaryButton from '@/volt/SecondaryButton.vue';
import { ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';
import type { IncomeSourceType } from '@/composeables/useIncomeSources';
import {
  INCOME_SOURCE_TYPE_ORDER,
  INCOME_SOURCE_TYPE_LABELS,
  INCOME_SOURCE_TYPE_ICONS,
} from '@/composeables/useIncomeSourceTypes';

// Accounts and income sources share one "+": a retirement account is the
// common case and sits first, followed by the three kinds of guaranteed
// income (see useIncomeSources.ts), which are added through their own form.
const emit = defineEmits<{
  (e: 'select', kind: 'account' | IncomeSourceType): void;
}>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function pick(kind: 'account' | IncomeSourceType) {
  open.value = false;
  emit('select', kind);
}

function onDocPointerDown(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
}
document.addEventListener('pointerdown', onDocPointerDown, true);
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true));

const itemClass =
  'flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800';
</script>

<template>
  <div ref="root" class="relative">
    <SecondaryButton rounded aria-label="Add account" :aria-expanded="open" @click="open = !open">
      <template #icon>
        <PlusIcon style="width: 14px; height: 14px" />
      </template>
    </SecondaryButton>

    <div
      v-if="open"
      class="absolute right-0 mt-1 w-52 py-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-lg z-10"
    >
      <button type="button" :class="itemClass" @click="pick('account')">
        <component :is="ACCOUNT_TYPE_ICONS.traditional" style="width: 16px; height: 16px" />
        Retirement Account
      </button>
      <div class="my-1 border-t border-surface-100 dark:border-surface-800" />
      <button
        v-for="type in INCOME_SOURCE_TYPE_ORDER"
        :key="type"
        type="button"
        :class="itemClass"
        @click="pick(type)"
      >
        <component :is="INCOME_SOURCE_TYPE_ICONS[type]" style="width: 16px; height: 16px" />
        {{ INCOME_SOURCE_TYPE_LABELS[type] }}
      </button>
    </div>
  </div>
</template>
