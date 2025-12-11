<script setup lang="ts">
import InputsDrawer from '@/components/InputsDrawer.vue';
import ProjectionChart from '@/components/projection/ProjectionChart.vue';
import ProjectionDetails from '@/components/projection/ProjectionDetails.vue';
</script>

<template>
<div class="mx-auto max-w-7xl p-3">
  <div class="space-y-6 lg:flex lg:space-x-6 lg:space-y-0">
    <InputsDrawer class="flex-1 lg:min-w-120"/>

    <div class="space-y-6">
      <ProjectionChart class="flex-1"/>

      <ProjectionDetails />
    </div>
  </div>

</div>
</template>

<style scoped>

</style>
