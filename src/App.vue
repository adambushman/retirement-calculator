<script setup lang="ts">
import { format } from 'd3-format';

import InputsDrawer from '@/components/InputsDrawer.vue';
import ProjectionChart from '@/components/projection/ProjectionChart.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";
const store = useRetirementStore();
</script>

<template>
<div class="p-3 space-y-3">
  <InputsDrawer />

  <ProjectionChart />

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
