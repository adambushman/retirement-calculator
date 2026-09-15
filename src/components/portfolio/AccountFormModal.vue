<script setup lang="ts">
import { computed, provide } from 'vue';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import InputsDrawer from '@/components/InputsDrawer.vue';

import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { AccountStoreKey } from '@/stores/accountStoreKey';

// Only ever mounted (via v-if in PortfolioView) while there's a real account
// being edited, so accountId is always valid for the component's lifetime.
const props = defineProps<{
  accountId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const portfolio = usePortfolioStore();

// Scope this account's store to InputsDrawer (which already does
// inject(AccountStoreKey)) exactly the way AccountCard does for the chart.
const store = useAccountStore(props.accountId);
provide(AccountStoreKey, store);

const name = computed({
  get: () => portfolio.accounts.find((a) => a.id === props.accountId)?.name ?? '',
  set: (value: string) => portfolio.renameAccount(props.accountId, value),
});
</script>

<template>
  <Dialog
    :visible="true"
    @update:visible="emit('close')"
    modal
    dismissable-mask
    header="Account Details"
    class="max-w-2xl w-full"
  >
    <div class="space-y-6">
      <div>
        <label class="block text-sm mb-2 text-gray-400" for="account-name-input">Account Name</label>
        <input
          id="account-name-input"
          v-model="name"
          type="text"
          class="rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950
            px-3 py-1.5 text-sm w-full max-w-sm outline-none focus-visible:outline focus-visible:outline-1
            focus-visible:outline-primary"
        />
      </div>

      <InputsDrawer />
    </div>

    <template #footer>
      <Button @click="emit('close')">Done</Button>
    </template>
  </Dialog>
</template>
