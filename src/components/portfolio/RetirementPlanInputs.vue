<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'd3-format';

import Slider from '@/volt/Slider.vue';
import StageCard from '@/components/portfolio/StageCard.vue';

import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';
import { ACCUMULATION_LABEL, ACCUMULATION_COLOR, stageEndAge } from '@/composeables/useStages';

// Unlike Context/Accounts, this section edits the real retirement-plan and
// account stores directly — no draft-then-commit modal — so every change
// here (including adding a stage via the "+" button in PortfolioView's
// header, which opens StageFormModal) takes effect immediately across the
// whole app.
const assumptions = usePortfolioAssumptionsStore();
const retirementPlan = useRetirementPlanStore();

const percent = format('.2~f');

const GROWTH_RATE_MIN = 4;
const GROWTH_RATE_MAX = 6;

// Where the handle sits along the track, as a percent — used to float the
// value label directly above it, same convention as the pre-retirement
// Growth Rate slider (see StepEarningSaving.vue).
const growthRatePercent = computed(
  () =>
    ((retirementPlan.growthRateIntraRetirement - GROWTH_RATE_MIN) / (GROWTH_RATE_MAX - GROWTH_RATE_MIN)) * 100
);

// A read-only "how this lines up" preview: Accumulation followed by every
// stage, each segment's width proportional to its own span of years —
// mirrors the linked-boundary feel of a single slider without a custom
// multi-handle control (PrimeVue's Slider tops out at 2 handles).
const timelineSegments = computed(() => {
  const total = assumptions.lifeExpectancy - assumptions.ageToday;
  if (total <= 0) return [];

  const firstStart = retirementPlan.stages[0]?.startAge ?? assumptions.lifeExpectancy;
  const segments = [
    {
      key: 'accumulation',
      label: ACCUMULATION_LABEL,
      color: ACCUMULATION_COLOR,
      years: firstStart - assumptions.ageToday,
    },
    ...retirementPlan.stages.map((stage, index) => ({
      key: stage.id,
      label: stage.name || 'Untitled Stage',
      color: stage.color,
      years: stageEndAge(retirementPlan.stages, index, assumptions.lifeExpectancy) - stage.startAge,
    })),
  ];

  return segments
    .filter((s) => s.years > 0)
    .map((s) => ({ ...s, widthPercent: (s.years / total) * 100 }));
});

// Withdrawal Start Age isn't a setting at all — it's read-only, derived from
// whichever stage first gives this account a nonzero Withdrawal Share (see
// StageCard.vue and useStages.ts's effectiveWithdrawalStartAge) — shown here
// purely for visibility, since it's otherwise not surfaced anywhere once a
// plan has several stages.
const portfolio = usePortfolioStore();
const accountRows = computed(() =>
  portfolio.accounts.map((meta) => {
    const account = useAccountStore(meta.id);
    return {
      id: meta.id,
      name: meta.name,
      typeLabel: ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType,
      typeIcon: ACCOUNT_TYPE_ICONS[account.accountType],
      withdrawalStartAge: account.withdrawalStartAge,
    };
  })
);
</script>

<template>
  <div class="space-y-6">
    <div v-if="timelineSegments.length" class="flex w-full h-3 rounded-full overflow-hidden">
      <div
        v-for="segment in timelineSegments"
        :key="segment.key"
        :style="{ width: segment.widthPercent + '%', backgroundColor: segment.color }"
        :title="`${segment.label} (${segment.years} yrs)`"
      />
    </div>

    <div class="max-w-sm">
      <label class="block text-sm mb-2 text-gray-400" for="intra-retire-growth-input">
        Growth Rate (During Withdrawals)
      </label>
      <p class="text-xs text-gray-400 mb-2">
        Applied to every account once it starts being withdrawn from, regardless of stage — a
        single, shared assumption for the retirement portfolio as a whole.
      </p>
      <div class="relative mt-6 pt-6">
        <span
          class="absolute top-0 -translate-x-1/2 leading-none text-sm font-semibold text-primary whitespace-nowrap"
          :style="{ left: `${growthRatePercent}%` }"
        >
          {{ percent(retirementPlan.growthRateIntraRetirement) }}%
        </span>
        <Slider
          v-model.number="retirementPlan.growthRateIntraRetirement"
          class="w-full mt-0"
          inputId="intra-retire-growth-input"
          :min="GROWTH_RATE_MIN"
          :max="GROWTH_RATE_MAX"
          :step="0.25"
        />
      </div>
    </div>

    <div v-if="retirementPlan.stages.length" class="space-y-4">
      <StageCard
        v-for="(stage, index) in retirementPlan.stages"
        :key="stage.id"
        :stage="stage"
        :index="index"
      />
    </div>
    <p v-else class="text-sm text-gray-500">
      No stages yet — everything stays in Accumulation all the way to life expectancy. Use the
      "+" button above to add your first stage.
    </p>

    <div v-if="accountRows.length">
      <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Per-Account Withdrawal Start</h4>
      <div class="flex flex-wrap gap-x-6 gap-y-1.5">
        <div
          v-for="row in accountRows"
          :key="row.id"
          class="flex items-center gap-1.5 text-sm"
        >
          <component :is="row.typeIcon" class="text-gray-400 shrink-0" style="width: 14px; height: 14px" />
          <span class="font-medium">{{ row.name }}</span>
          <span class="text-gray-400 text-xs">
            {{
              Number.isFinite(row.withdrawalStartAge)
                ? `withdraws from age ${row.withdrawalStartAge}`
                : 'never withdraws — toggle it on in some stage'
            }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
