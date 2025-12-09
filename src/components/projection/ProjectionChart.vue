<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import Panel from '@/volt/Panel.vue';
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import PlotFigure from '@/components/projection/PlotFigure.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";

const store = useRetirementStore();
</script>

<template>
<Panel>
  <div class="flex justify-end space-x-2">
    <span class="self-center text-gray-400">Adjust for Inflation</span>
    <ToggleSwitch v-model="store.inflationAdjChoice" />
  </div>
  <PlotFigure
    :options="{
      width: 1000,
      height: 400,
      marginLeft: 65,
      marks: [
        Plot.barY(store.projectionGraph, {x: 'age', y: 'balance', fill: 'stage'}),
      ],
    }"
  />
</Panel>
</template>

<style scoped>

</style>