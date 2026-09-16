<script setup lang="ts">
import { computed } from 'vue';

import { usePortfolioCoverage } from '@/composeables/usePortfolioCoverage';
import { STAGE_BRIDGE, STAGE_COLORS } from '@/composeables/useStages';

const { bridgeStartAge, stageCoverage } = usePortfolioCoverage();

// Hide the Bridge row entirely when no account actually withdraws early —
// showing "Bridge: 0% covered" for a portfolio that isn't using it at all
// would just be noise.
const visibleCoverage = computed(() =>
  stageCoverage.value.filter((c) => c.stage !== STAGE_BRIDGE || bridgeStartAge.value !== null)
);
</script>

<template>
  <div v-if="visibleCoverage.length" class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
    <span v-for="c in visibleCoverage" :key="c.stage" class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: STAGE_COLORS[c.stage] }" />
      {{ c.stage }}: {{ Math.round(c.coveragePercent) }}% covered
    </span>
  </div>
</template>
