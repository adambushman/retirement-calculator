<script setup lang="ts">
import { provide } from 'vue';

import { useAccountStore } from '@/stores/useAccountStore';
import { AccountStoreKey } from '@/stores/accountStoreKey';

import InputsDrawer from '@/components/InputsDrawer.vue';
import ProjectionPanel from '@/components/projection/ProjectionPanel.vue';

const props = defineProps<{
  accountId: string;
}>();

// Scope this account's store to everything rendered below (InputsDrawer,
// ProjectionPanel, and all of their descendants) via provide/inject, instead
// of threading accountId through every intermediate component's props.
const store = useAccountStore(props.accountId);
provide(AccountStoreKey, store);
</script>

<template>
  <div class="space-y-6 lg:flex lg:space-x-6 lg:space-y-0">
    <InputsDrawer class="flex-1 lg:min-w-120" />

    <ProjectionPanel class="flex-2" />
  </div>
</template>
