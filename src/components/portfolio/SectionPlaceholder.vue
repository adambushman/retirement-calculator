<script setup lang="ts">
import Button from '@/volt/Button.vue';

// The "not yet unlocked" state for one of PortfolioView's top-level
// sections — see PortfolioView.vue's step sequence. `active` means this is
// the very next thing to do (normal opacity, button enabled if there is
// one); anything further down the sequence renders the same card dimmed,
// with its button disabled — sections with no button of their own (Portfolio,
// Retirement Plan, Summary all just depend on an account existing) render
// numbered and dimmed with no button at all, only the description pointing
// back up at what still needs finishing.
defineProps<{
  number: number;
  title: string;
  description: string;
  active: boolean;
  buttonLabel?: string;
}>();

defineEmits<{
  (e: 'action'): void;
}>();
</script>

<template>
  <div
    class="flex flex-col items-center gap-3 py-10 px-4 text-center rounded-lg border border-dashed
      border-surface-200 dark:border-surface-700"
    :class="!active && 'opacity-50'"
  >
    <div class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
      bg-surface-100 dark:bg-surface-800 text-gray-400">
      {{ number }}
    </div>
    <p class="font-medium">{{ title }}</p>
    <p class="text-sm text-gray-500">{{ description }}</p>
    <Button v-if="buttonLabel" :label="buttonLabel" :disabled="!active" @click="$emit('action')">
      <template v-if="$slots.icon" #icon>
        <slot name="icon" />
      </template>
    </Button>
  </div>
</template>
