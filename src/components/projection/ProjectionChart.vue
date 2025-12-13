<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed } from 'vue';

import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import PlotFigure from '@/components/projection/PlotFigure.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";

const store = useRetirementStore();

const ageBin = computed(() => {
  const ages = store.projectionGraph.map(y => y.age);
  return ages.filter((a,i) => a % 10 === 0);
})
</script>

<template>
<div class="flex justify-end space-x-2 mb-2">
  <span class="self-center text-gray-400">Adjust for Inflation</span>
  <ToggleSwitch v-model="store.inflationAdjChoice" />
</div>
<PlotFigure
  :options="{
    width: 1000,
    height: 500,
    marginLeft: 70,
    y: { ticks: 5, tickFormat: '$,.1s', label: null },
    x: { ticks: ageBin, label: null },
    style: { fontSize: '22px' },
    marks: [
      Plot.barY(store.projectionGraph, {x: 'age', y: 'balance', fill: 'stage'}),
    ],
  }"
/>
</template>

<style scoped>

</style>