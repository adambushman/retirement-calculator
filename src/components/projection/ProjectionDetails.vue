<script setup lang="ts">
import { format } from 'd3-format';
import StageSummaryPanel from '@/components/stage-summary/StageSummaryPanel.vue';

import Panel from '@/volt/Panel.vue';
import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';
import TabPanels from '@/volt/TabPanels.vue';
import TabPanel from '@/volt/TabPanel.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";

const store = useRetirementStore();
</script>

<template>
  <Panel header="Projection">
    <Tabs value="0">
      <TabList>
          <Tab value="0">Summary</Tab>
          <Tab value="1">Stage Breakdown</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="0">
          <div v-if="store.finalNoGoBalance > 0">
            <p class="text-lg">Based on these assumptions, you will likely
              <span style="color: var(--p-primary-color)" class="font-bold text-xl">have money left over! 🥳</span>
            </p>
          </div>
          <div v-else class="space-y-4">
            <p class="text-lg">Based on these assumptions, you will likely
              <span class="lg-highlight">run out of money... 😢</span>
            </p>
          </div>
          <p class="mt-4">Given a starting retirement fund of
            <span class="md-highlight">{{ format("$,.2s")(store.finalPreRetirementBalance) }}</span>
            and average monthly widthdrawals of
            <span class="md-highlight">{{ format("$,.2s")(store.avgMonthlyWithdrawal * -1) }}</span>,
            your final balance is expected to be
            <span class="md-highlight">{{ format("$,.2s")(store.finalNoGoBalance) }}</span>.
          </p>
        </TabPanel>
        <TabPanel value="1">

          <StageSummaryPanel />

        </TabPanel>
      </TabPanels>
    </Tabs>
  </Panel>
</template>

<style scoped>
.md-highlight, .lg-highlight {
  font-weight: bold;
  color: var(--p-primary-color);
}
.md-highlight {
  font-size: var(--text-lg);
}
.lg-highlight {
  font-size: var(--text-xl);
}
</style>