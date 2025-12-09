<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { format } from 'd3-format';
import { ref, toRefs, computed } from 'vue';

import { prepareGrowthProjection } from '@/composeables/useProjections';
import type { FullProjection } from '@/composeables/useProjections';

import PlotFigure from '@/components/PlotFigure.vue';
import InputsDrawer from '@/components/InputsDrawer.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";

const store = useRetirementStore();
</script>

<template>
<div>
  <InputsDrawer />
</div>
<div>
<h1>Pre-Retirement End Balance (Raw): {{ format("$,.2f")(store.finalPreRetirementBalance) }}</h1>
<h1>Go-Go Years End Balance (Raw): {{ format("$,.2f")(store.finalGoGoYearsBalance) }}</h1>
<h1>Slow-Go Years End Balance (Raw): {{ format("$,.2f")(store.finalSlowGoYearsBalance) }}</h1>
<h1>No-Go Years End Balance (Raw): {{ format("$,.2f")(store.finalNoGoYearsBalance) }}</h1>
</div>

<div>
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
</div>

</template>

<style scoped>

</style>
