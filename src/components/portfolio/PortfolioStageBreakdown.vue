<script setup lang="ts">
import { computed } from 'vue';

import SingleStageSummary from '@/components/stage-summary/SingleStageSummary.vue';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { usePortfolioCoverage } from '@/composeables/usePortfolioCoverage';
import type { StageAggregate } from '@/composeables/usePortfolioProjection';
import {
  STAGE_ACCUMULATION,
  STAGE_BRIDGE,
  STAGE_GO_GO,
  STAGE_SLOW_GO,
  STAGE_NO_GO,
} from '@/composeables/useStages';

const props = defineProps<{
  stageAggregates: StageAggregate[];
}>();

const assumptions = usePortfolioAssumptionsStore();
const { bridgeStartAge, accumulationEndAge } = usePortfolioCoverage();

// Average monthly contribution/withdrawal for a stage: its total flow spread
// across the months the stage actually spans.
const perMonth = (totalFlow: number, years: number) =>
  years > 0 ? totalFlow / years / 12 : 0;

const aggregateFor = (stage: string) =>
  props.stageAggregates.find((s) => s.stage === stage) ?? { finalBalance: 0, totalFlow: 0, totalGrowth: 0 };

// Go-Go/Slow-Go/No-Go age ranges are already unambiguous (shared portfolio
// boundaries); Accumulation and Bridge get portfolio-wide ranges too —
// Accumulation runs until the last account unlocks (which is Retirement Age
// unless some account starts later), Bridge from the earliest account's own
// start age (see usePortfolioCoverage) to Retirement Age.
const stages = computed(() => {
  const [goGoEndAge, slowGoEndAge] = assumptions.retirementBoundaries;

  const list = [
    {
      stage: STAGE_ACCUMULATION,
      years: [assumptions.ageToday, accumulationEndAge.value - 1],
      ...aggregateFor(STAGE_ACCUMULATION),
    },
  ];

  if (bridgeStartAge.value !== null) {
    list.push({
      stage: STAGE_BRIDGE,
      years: [bridgeStartAge.value, assumptions.retirementAge - 1],
      ...aggregateFor(STAGE_BRIDGE),
    });
  }

  list.push(
    {
      stage: STAGE_GO_GO,
      years: [assumptions.retirementAge, (goGoEndAge ?? assumptions.retirementAge) - 1],
      ...aggregateFor(STAGE_GO_GO),
    },
    {
      stage: STAGE_SLOW_GO,
      years: [goGoEndAge ?? assumptions.retirementAge, (slowGoEndAge ?? assumptions.retirementAge) - 1],
      ...aggregateFor(STAGE_SLOW_GO),
    },
    {
      stage: STAGE_NO_GO,
      years: [slowGoEndAge ?? assumptions.retirementAge, assumptions.lifeExpectancy - 1],
      ...aggregateFor(STAGE_NO_GO),
    },
  );

  return list;
});
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    <SingleStageSummary
      v-for="s in stages"
      :key="s.stage"
      :stage="s.stage"
      :finalBalance="s.finalBalance"
      :totalFlow="s.totalFlow"
      :avgMonthlyFlow="perMonth(s.totalFlow, s.years[1]! - s.years[0]! + 1)"
      :totalGrowth="s.totalGrowth"
      :years="s.years"
    />
  </div>
</template>
