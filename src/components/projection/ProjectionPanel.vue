<script setup lang="ts">
import ProjectionChart from '@/components/projection/ProjectionChart.vue';
import ProjectionDetails from '@/components/projection/ProjectionDetails.vue';
import Section from '@/components/Section.vue';

import Panel from '@/volt/Panel.vue';

</script>

<template>
<Section title="Results">
    <Panel>
      <ProjectionChart />

      <ProjectionDetails />
    </Panel>
</Section>
</template>

<style scoped>

</style>