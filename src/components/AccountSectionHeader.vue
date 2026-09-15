<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
<div class="flex items-stretch gap-3">
  <div class="w-0.5 bg-primary shrink-0"></div>
  <div class="flex-1 min-w-0">
    <div class="flex items-center justify-between gap-2 mb-3">
      <h2 class="text-lg lg:text-xl font-bold text-primary truncate">{{ title }}</h2>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</div>
</template>
