<script setup lang="ts">
import { format } from 'd3-format';

import InputsDrawer from '@/components/InputsDrawer.vue';
import ProjectionChart from '@/components/projection/ProjectionChart.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";
const store = useRetirementStore();
</script>

<template>
<div class="mx-auto max-w-7xl p-3">
  <div class="space-y-6 md:flex md:space-x-6 md:space-y-0">
    <InputsDrawer class="flex-1 md:min-w-120"/>

    <div>
      <ProjectionChart class="flex-1"/>
    </div>
  </div>

  <div>
    <h1>Pre-Retirement End Balance (Raw): {{ format("$,.2f")(store.finalPreRetirementBalance) }}</h1>
    <h1>Go-Go Years End Balance (Raw): {{ format("$,.2f")(store.finalGoGoYearsBalance) }}</h1>
    <h1>Slow-Go Years End Balance (Raw): {{ format("$,.2f")(store.finalSlowGoYearsBalance) }}</h1>
    <h1>No-Go Years End Balance (Raw): {{ format("$,.2f")(store.finalNoGoYearsBalance) }}</h1>
  </div>
</div>
</template>

<style scoped>

</style>
