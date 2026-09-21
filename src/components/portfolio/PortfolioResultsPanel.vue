<script setup lang="ts">
import { ref, computed } from 'vue';

import Panel from '@/volt/Panel.vue';
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import PortfolioChart from '@/components/portfolio/PortfolioChart.vue';
import PortfolioStageBreakdown from '@/components/portfolio/PortfolioStageBreakdown.vue';
import { usePortfolioProjection } from '@/composeables/usePortfolioProjection';

// Independent of any single account's own "Adjust for Inflation" choice —
// this toggle governs the combined chart and stage breakdown together.
const inflationAdjusted = ref(true);
const perspective = computed(() => (inflationAdjusted.value ? 'inflation-adjusted' : 'raw'));

const { rows, stageAggregates } = usePortfolioProjection(perspective);
</script>

<template>
  <Panel>
    <div class="flex justify-end space-x-2 mb-2">
      <span class="self-center text-gray-400">Adjust for Inflation</span>
      <ToggleSwitch v-model="inflationAdjusted" />
    </div>

    <PortfolioChart :rows="rows" />

    <PortfolioStageBreakdown :stage-aggregates="stageAggregates" class="mt-6" />
  </Panel>
</template>
