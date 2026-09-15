<script setup lang="ts">
import ProjectionChart from '@/components/projection/ProjectionChart.vue';
import ProjectionDetails from '@/components/projection/ProjectionDetails.vue';
import AccountSectionHeader from '@/components/AccountSectionHeader.vue';

import Panel from '@/volt/Panel.vue';

</script>

<template>
<AccountSectionHeader title="Results">
    <Panel>
      <ProjectionChart />

      <ProjectionDetails />
    </Panel>
</AccountSectionHeader>
</template>

<style scoped>

</style>