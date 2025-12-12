<script setup lang="ts">
import StageSummaryPanel from '@/components/stage-summary/StageSummaryPanel.vue';
import ProjectionSummary from '@/components/projection/ProjectionSummary.vue';
import Recommendations from '@/components/Recommendations.vue';

import Panel from '@/volt/Panel.vue';
import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';
import TabPanels from '@/volt/TabPanels.vue';
import TabPanel from '@/volt/TabPanel.vue';
</script>

<template>
  <Tabs value="0" scrollable>
    <TabList>
        <Tab value="0">Summary</Tab>
        <Tab value="1">Stage Breakdown</Tab>
        <Tab value="2">Recommendations</Tab>
    </TabList>
    <TabPanels class="mt-5">
      <TabPanel value="0">

        <ProjectionSummary />

      </TabPanel>
      <TabPanel value="1">

        <StageSummaryPanel />

      </TabPanel>
      <TabPanel value="2">

        <Recommendations />

      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<style scoped>
:deep([data-pc-section="nextbutton"]),
:deep([data-pc-section="prevbutton"]) {
  box-shadow: none !important;
}
</style>