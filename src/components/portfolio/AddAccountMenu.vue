<script lang="ts">
import type { AccountType } from '@/stores/useAccountStore';
import type { IncomeSourceType } from '@/composeables/useIncomeSources';

/**
 * What the "+" menu hands back: a specific account type, or a specific kind
 * of guaranteed income. The type is chosen here rather than inside the form,
 * so either modal opens straight onto its own details.
 */
export type AddSelection =
  | { kind: 'account'; type: AccountType }
  | { kind: 'income'; type: IncomeSourceType };
</script>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import PlusIcon from '@primevue/icons/plus';

import SecondaryButton from '@/volt/SecondaryButton.vue';
import {
  ACCOUNT_TYPE_ORDER,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_GROUP_LABELS,
  isRetirementAccountType,
} from '@/composeables/useAccountTypes';
import {
  INCOME_SOURCE_TYPE_ORDER,
  INCOME_SOURCE_TYPE_LABELS,
  INCOME_SOURCE_TYPE_ICONS,
} from '@/composeables/useIncomeSourceTypes';

// Accounts and income sources share one "+", grouped under headings so the
// three kinds of guaranteed income (see useIncomeSources.ts) read as their
// own category rather than as more account types.
const emit = defineEmits<{
  (e: 'select', selection: AddSelection): void;
}>();

// Grouped the same way, and under the same headings, as the Accounts
// section itself — see isRetirementAccountType.
const accountGroups: Array<{ label: string; types: AccountType[] }> = [
  { label: ACCOUNT_GROUP_LABELS.retirement, types: ACCOUNT_TYPE_ORDER.filter(isRetirementAccountType) },
  { label: ACCOUNT_GROUP_LABELS.taxable, types: ACCOUNT_TYPE_ORDER.filter((t) => !isRetirementAccountType(t)) },
];

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function pick(selection: AddSelection) {
  open.value = false;
  emit('select', selection);
}

function onDocPointerDown(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
}
document.addEventListener('pointerdown', onDocPointerDown, true);
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true));

const itemClass =
  'flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800';
const headerClass = 'px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400';
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
      class="absolute right-0 mt-1 w-56 py-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-lg z-10"
    >
      <template v-for="(group, i) in accountGroups" :key="group.label">
        <div v-if="i > 0" class="my-1 border-t border-surface-100 dark:border-surface-800" />
        <div :class="headerClass">{{ group.label }}</div>
        <button
          v-for="type in group.types"
          :key="type"
          type="button"
          :class="itemClass"
          @click="pick({ kind: 'account', type })"
        >
          <component :is="ACCOUNT_TYPE_ICONS[type]" style="width: 16px; height: 16px" />
          {{ ACCOUNT_TYPE_LABELS[type] }}
        </button>
      </template>

      <div class="my-1 border-t border-surface-100 dark:border-surface-800" />
      <div :class="headerClass">Guaranteed Income</div>
      <button
        v-for="type in INCOME_SOURCE_TYPE_ORDER"
        :key="type"
        type="button"
        :class="itemClass"
        @click="pick({ kind: 'income', type })"
      >
        <component :is="INCOME_SOURCE_TYPE_ICONS[type]" style="width: 16px; height: 16px" />
        {{ INCOME_SOURCE_TYPE_LABELS[type] }}
      </button>
    </div>
  </div>
</template>
