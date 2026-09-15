<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import ChevronDownIcon from '@primevue/icons/chevrondown';

import { useOwnersStore } from '@/stores/useOwnersStore';

const modelValue = defineModel<string>({ default: '' });

const owners = useOwnersStore();

const open = ref(false);
const draftName = ref('');
const root = ref<HTMLElement | null>(null);

function select(name: string) {
  modelValue.value = name;
  open.value = false;
}

function addAndSelect() {
  const created = owners.addOwner(draftName.value);
  if (!created) return;
  modelValue.value = created;
  draftName.value = '';
  open.value = false;
}

function onDocPointerDown(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) {
    open.value = false;
  }
}
document.addEventListener('pointerdown', onDocPointerDown, true);
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true));
</script>

<template>
  <div ref="root" class="relative max-w-sm">
    <button
      type="button"
      @click="open = !open"
      class="w-full flex items-center justify-between gap-2 rounded-md border border-surface-300 dark:border-surface-700
        bg-surface-0 dark:bg-surface-950 px-3 py-1.5 text-sm outline-none
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
    >
      <span :class="modelValue ? '' : 'text-gray-400'">{{ modelValue || 'Unassigned' }}</span>
      <ChevronDownIcon style="width: 12px; height: 12px" class="text-gray-400 shrink-0" />
    </button>

    <div
      v-if="open"
      class="absolute left-0 right-0 mt-1 rounded-md border border-surface-200 dark:border-surface-700
        bg-surface-0 dark:bg-surface-900 shadow-lg z-10 py-1"
    >
      <button
        type="button"
        @click="select('')"
        class="block w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-surface-100 dark:hover:bg-surface-800"
      >
        Unassigned
      </button>

      <button
        v-for="name in owners.owners"
        :key="name"
        type="button"
        @click="select(name)"
        class="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800"
        :class="name === modelValue ? 'font-medium' : ''"
      >
        {{ name }}
      </button>

      <div class="border-t border-surface-200 dark:border-surface-700 mt-1 pt-2 px-2">
        <input
          v-model="draftName"
          type="text"
          placeholder="Add new owner…"
          @keyup.enter="addAndSelect"
          @click.stop
          class="w-full rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950
            px-2 py-1 text-sm outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
        />
      </div>
    </div>
  </div>
</template>
