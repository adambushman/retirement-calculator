<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  position?: 'top' | 'bottom' | 'left' | 'right';
}>();

const isHovered = ref(false);

/** Compute position classes dynamically */
const positionClasses = computed(() => {
  switch (props.position) {
    case 'bottom':
      return 'top-full left-1/2 -translate-x-1/2 mt-2';
    case 'left':
      return 'right-full top-1/2 -translate-y-1/2 mr-2';
    case 'right':
      return 'left-full top-1/2 -translate-y-1/2 ml-2';
    case 'top':
    default:
      return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
  }
});
</script>

<template>
  <div
    class="tooltip-wrapper relative inline-flex"
    @click="isHovered = !isHovered"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Icon -->
    <slot name="icon" />

    <!-- Tooltip -->
    <transition name="fade">
      <div
        v-if="isHovered"
        class="tooltip absolute p-2 text-xs border rounded whitespace-normal min-w-[240px] w-auto"
        :class="positionClasses"
      >
        <slot />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tooltip-wrapper {
  color: var(--p-text-color);
}

/* Tooltip inherits Volt theme colors */
.tooltip {
  background: var(--p-surface-800);
  color: var(--p-surface-0);
  border-color: var(--p-content-border-color);
  z-index: 9999;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>