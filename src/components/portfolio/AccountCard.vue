<script setup lang="ts">
import { ref, computed, provide, onBeforeUnmount } from 'vue';
import { format } from 'd3-format';
import ChevronDownIcon from '@primevue/icons/chevrondown';
import ChevronUpIcon from '@primevue/icons/chevronup';

import Panel from '@/volt/Panel.vue';
import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { AccountStoreKey } from '@/stores/accountStoreKey';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';
import AccountAttributes from '@/components/portfolio/AccountAttributes.vue';
import AccountValues from '@/components/portfolio/AccountValues.vue';
import AccountGrowthSummary from '@/components/portfolio/AccountGrowthSummary.vue';

const props = defineProps<{
  accountId: string;
  name: string;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void;
  (e: 'edit', accountId: string): void;
}>();

const portfolio = usePortfolioStore();
const store = useAccountStore(props.accountId);
// Scope this account's store to AccountValues/AccountGrowthSummary and
// everything under them, the same key AccountFormModal provides for its
// wizard steps.
provide(AccountStoreKey, store);

const editingName = ref(false);
const draftName = ref(props.name);
const accountTypeLabel = computed(() => ACCOUNT_TYPE_LABELS[store.accountType] ?? store.accountType);
const accountTypeIcon = computed(() => ACCOUNT_TYPE_ICONS[store.accountType]);

// Same SI-prefixed formatting as the Results KPIs (see AccountGrowthSummary)
// — this line is a quick sense of scale, not a precise figure.
const compactDollars = format('$.3~s');

function startRename() {
  draftName.value = props.name;
  editingName.value = true;
}

function commitRename() {
  const trimmed = draftName.value.trim();
  if (trimmed) portfolio.renameAccount(props.accountId, trimmed);
  editingName.value = false;
}

function remove() {
  if (confirm(`Remove "${props.name}"? This can't be undone.`)) {
    portfolio.removeAccount(props.accountId);
  }
}

function toggle() {
  emit('update:collapsed', !props.collapsed);
}

// Menu actions
const menuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);

function onEdit() {
  menuOpen.value = false;
  emit('edit', props.accountId);
}

function onDelete() {
  menuOpen.value = false;
  remove();
}

function onDocPointerDown(e: PointerEvent) {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(e.target as Node)) {
    menuOpen.value = false;
  }
}
document.addEventListener('pointerdown', onDocPointerDown, true);
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true));
</script>

<template>
  <Panel>
    <template #header>
      <div class="flex items-center gap-1.5 min-w-0">
        <input
          v-if="editingName"
          v-model="draftName"
          @blur="commitRename"
          @keyup.enter="commitRename"
          @keyup.esc="editingName = false"
          @click.stop
          class="text-lg lg:text-xl font-bold bg-transparent border-b border-current outline-none min-w-0 w-40"
          autofocus
        />
        <button
          v-else
          type="button"
          @click.stop="startRename"
          class="text-lg lg:text-xl font-bold truncate max-w-48 text-left"
          title="Click to rename"
        >
          {{ name }}
        </button>
        <span class="flex items-center gap-1.5 text-lg lg:text-xl font-bold text-gray-400 shrink-0">
          <span>|</span>
          <component :is="accountTypeIcon" style="width: 18px; height: 18px" />
          {{ accountTypeLabel }}
        </span>
      </div>
    </template>

    <template #icons>
      <div class="flex items-center gap-1">
        <div ref="menuRoot" class="relative">
          <button
            type="button"
            @click.stop="menuOpen = !menuOpen"
            aria-label="Account actions"
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
            </svg>
          </button>

          <div
            v-if="menuOpen"
            class="absolute right-0 mt-1 w-32 py-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-lg z-10"
          >
            <button
              type="button"
              @click="onEdit"
              class="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Edit
            </button>
            <button
              type="button"
              @click="onDelete"
              class="block w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Delete
            </button>
          </div>
        </div>

        <button
          type="button"
          @click.stop="toggle"
          :aria-label="collapsed ? 'Expand account' : 'Collapse account'"
          class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <ChevronUpIcon v-if="!collapsed" style="width: 14px; height: 14px" />
          <ChevronDownIcon v-else style="width: 14px; height: 14px" />
        </button>
      </div>
    </template>

    <div class="flex items-center gap-2 text-sm lg:text-base text-gray-500 -mt-3">
      <span>{{ compactDollars(store.currentBalance) }} today</span>
      <span>&rarr;</span>
      <span :class="store.balanceAtWithdrawalStart < 0 ? 'text-red-500' : 'text-emerald-500'">
        {{ compactDollars(store.balanceAtWithdrawalStart) }} by first withdrawal
      </span>
    </div>

    <div v-if="!collapsed" class="space-y-6">
      <AccountAttributes class="w-full mt-6" />
      <AccountValues class="w-full" />
      <AccountGrowthSummary class="w-full" />
    </div>
  </Panel>
</template>
