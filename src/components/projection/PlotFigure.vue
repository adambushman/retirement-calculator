<script setup lang="ts">
import * as Plot from "@observablehq/plot";
import { onMounted, onBeforeUnmount, watch, ref } from "vue";

const props = defineProps<{
  options: any;
}>();

const emit = defineEmits<{
  (e: 'render', el: HTMLElement | SVGElement): void;
}>();

const container = ref<HTMLElement | null>(null);
let plot: HTMLElement | SVGElement | null = null;

function renderPlot() {
  if (!container.value) return;

  // Remove previous plot
  if (plot) {
    container.value.removeChild(plot);
  }

  // Create new plot
  plot = Plot.plot(props.options);
  container.value.appendChild(plot);

  // Let the parent attach behaviour to the freshly rendered figure
  emit('render', plot);
}

onMounted(renderPlot);

// Re-run whenever options change
watch(() => props.options, () => renderPlot(), { deep: true });

onBeforeUnmount(() => {
  if (plot && container.value) {
    container.value.removeChild(plot);
  }
});
</script>

<template>
  <div ref="container"></div>
</template>
