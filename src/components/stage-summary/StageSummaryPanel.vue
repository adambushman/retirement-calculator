<script setup lang="ts">
import Panel from '@/volt/Panel.vue';
import StageSummary from '@/components/stage-summary/SingleStageSummary.vue';

import { useRetirementStore } from "@/stores/useRetirementStore";
const store = useRetirementStore();

// Average monthly contribution/withdrawal for a stage: its total flow spread
// across the months the stage actually spans.
const perMonth = (totalFlow: number, years: number) =>
  years > 0 ? totalFlow / years / 12 : 0;
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
    <StageSummary
      stage="Pre-Retirement"
      :finalBalance="store.finalPreRetirementBalance"
      :totalFlow="store.totalPreRetirementFlow"
      :avgMonthlyFlow="perMonth(store.totalPreRetirementFlow, store.yearsUntilRetirement)"
      :totalGrowth="store.totalPreRetirementGrowth"
      :years="[store.ageToday, store.ageRetirement - 1]"
    />

    <StageSummary
      stage="Go-Go Years"
      :finalBalance="store.finalGoGoBalance"
      :totalFlow="store.totalGoGoFlow"
      :avgMonthlyFlow="perMonth(store.totalGoGoFlow, store.yearsInGoGo)"
      :totalGrowth="store.totalGoGoGrowth"
      :years="[store.ageRetirement, store.retirementBoundaries[0]! - 1]"
    />

    <StageSummary
      stage="Slow-Go Years"
      :finalBalance="store.finalSlowGoBalance"
      :totalFlow="store.totalSlowGoFlow"
      :avgMonthlyFlow="perMonth(store.totalSlowGoFlow, store.yearsInSlowGo)"
      :totalGrowth="store.totalSlowGoGrowth"
      :years="[store.retirementBoundaries[0]!, store.retirementBoundaries[1]! - 1]"
    />

    <StageSummary
      stage="No-Go Years"
      :finalBalance="store.finalNoGoBalance"
      :totalFlow="store.totalNoGoFlow"
      :avgMonthlyFlow="perMonth(store.totalNoGoFlow, store.yearsInNoGo)"
      :totalGrowth="store.totalNoGoGrowth"
      :years="[store.retirementBoundaries[1]!, store.lifeExpectancy - 1]"
    />
  </div>
</template>