<script setup lang="ts">
import { computed } from 'vue';

import SingleStageSummary from '@/components/stage-summary/SingleStageSummary.vue';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { usePortfolioCoverage } from '@/composeables/usePortfolioCoverage';
import type { StageAggregate } from '@/composeables/usePortfolioProjection';
import {
  ACCUMULATION_ID,
  ACCUMULATION_LABEL,
  ACCUMULATION_COLOR,
  ACCUMULATION_DESCRIPTION,
  stageEndAge,
} from '@/composeables/useStages';

const props = defineProps<{
  stageAggregates: StageAggregate[];
}>();

const assumptions = usePortfolioAssumptionsStore();
const retirementPlan = useRetirementPlanStore();
const { accumulationEndAge } = usePortfolioCoverage();

// Average monthly contribution/withdrawal for a stage: its total flow spread
// across the months the stage actually spans.
const perMonth = (totalFlow: number, years: number) =>
  years > 0 ? totalFlow / years / 12 : 0;

const aggregateFor = (stage: string) =>
  props.stageAggregates.find((s) => s.stage === stage) ?? {
    finalBalance: 0,
    totalFlow: 0,
    totalGrowth: 0,
    guaranteedIncome: 0,
  };

// Accumulation, followed by every user-defined stage in order — each stage's
// own age range falls out of its startAge and derived endAge, no manual
// boundary bookkeeping needed here.
const stages = computed(() => {
  const list = [
    {
      stageId: ACCUMULATION_ID,
      name: ACCUMULATION_LABEL,
      color: ACCUMULATION_COLOR,
      description: ACCUMULATION_DESCRIPTION,
      years: [assumptions.ageToday, accumulationEndAge.value - 1],
      ...aggregateFor(ACCUMULATION_ID),
    },
  ];

  retirementPlan.stages.forEach((stage, index) => {
    list.push({
      stageId: stage.id,
      name: stage.name || 'Untitled Stage',
      color: stage.color,
      description: stage.description,
      years: [stage.startAge, stageEndAge(retirementPlan.stages, index, assumptions.lifeExpectancy) - 1],
      ...aggregateFor(stage.id),
    });
  });

  return list;
});
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    <SingleStageSummary
      v-for="s in stages"
      :key="s.stageId"
      :name="s.name"
      :color="s.color"
      :description="s.description"
      :finalBalance="s.finalBalance"
      :totalFlow="s.totalFlow"
      :avgMonthlyFlow="perMonth(s.totalFlow, s.years[1]! - s.years[0]! + 1)"
      :totalGrowth="s.totalGrowth"
      :avgMonthlyIncome="perMonth(s.guaranteedIncome, s.years[1]! - s.years[0]! + 1)"
      :isAccumulation="s.stageId === ACCUMULATION_ID"
      :years="s.years"
    />
  </div>
</template>
