<script setup lang="ts">
import Panel from '@/volt/Panel.vue';
import StageSummary from '@/components/stage-summary/SingleStageSummary.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";
const store = useRetirementStore();
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
    <StageSummary
      stage="Pre-Retirement"
      :finalBalance="store.finalPreRetirementBalance"
      :totalFlow="store.totalPreRetirementFlow"
      :totalGrowth="store.totalPreRetirementGrowth"
    />

    <StageSummary
      stage="Go-Go Years"
      :finalBalance="store.finalGoGoBalance"
      :totalFlow="store.totalGoGoFlow"
      :totalGrowth="store.totalGoGoGrowth"
    />

    <StageSummary
      stage="Slow-Go Years"
      :finalBalance="store.finalSlowGoBalance"
      :totalFlow="store.totalSlowGoFlow"
      :totalGrowth="store.totalSlowGoGrowth"
    />

    <StageSummary
      stage="No-Go Years"
      :finalBalance="store.finalNoGoBalance"
      :totalFlow="store.totalNoGoFlow"
      :totalGrowth="store.totalNoGoGrowth"
    />
  </div>
</template>