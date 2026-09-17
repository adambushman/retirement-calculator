<script setup lang="ts">
</script>

<template>
<div class="mb-4">
  <h2 class="text-3xl border-l-4 ps-2" :class="$slots.subtitle ? 'mb-1' : ''">
    <slot />
  </h2>
  <p v-if="$slots.subtitle" class="text-sm lg:text-base text-gray-400 ps-3">
    <slot name="subtitle" />
  </p>
</div>
</template>

<style scoped>
h2 {
  border-color: var(--p-primary-color);
}
</style>
