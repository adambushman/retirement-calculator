<script setup lang="ts">
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { usePortfolioCoverage } from '@/composeables/usePortfolioCoverage';

const retirementPlan = useRetirementPlanStore();
const { stageCoverage } = usePortfolioCoverage();

function nameForStage(stageId: string): string {
  return retirementPlan.stages.find((s) => s.id === stageId)?.name || 'Untitled Stage';
}
</script>

<template>
  <div v-if="stageCoverage.length" class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
    <span v-for="c in stageCoverage" :key="c.stage" class="flex items-center gap-1.5">
      <span
        class="w-2 h-2 rounded-full inline-block"
        :style="{ backgroundColor: retirementPlan.stages.find((s) => s.id === c.stage)?.color }"
      />
      {{ nameForStage(c.stage) }}: {{ Math.round(c.coveragePercent) }}% covered
    </span>
  </div>
</template>
