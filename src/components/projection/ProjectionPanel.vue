<script setup lang="ts">
import ProjectionChart from '@/components/projection/ProjectionChart.vue';
import ProjectionDetails from '@/components/projection/ProjectionDetails.vue';
import SectionHeader from '@/components/SectionHeader.vue';

import Panel from '@/volt/Panel.vue';

</script>

<template>
<div>
  <SectionHeader>Results</SectionHeader>
    <Panel>
      <ProjectionChart class="flex-1"/>

      <ProjectionDetails />
    </Panel>
</div>
</template>

<style scoped>

</style>