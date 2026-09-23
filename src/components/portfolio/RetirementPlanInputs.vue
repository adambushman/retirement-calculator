<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'd3-format';

import Slider from '@/volt/Slider.vue';
import StageCard from '@/components/portfolio/StageCard.vue';

import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useIncomeSourcesStore } from '@/stores/useIncomeSourcesStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_RULES } from '@/composeables/useAccountTypes';
import { INCOME_SOURCE_TYPE_ICONS } from '@/composeables/useIncomeSourceTypes';
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

// When each piece of the plan starts paying, side by side: an account's own
// withdrawal start age next to the age each guaranteed source begins. Neither
// is a setting here. An account's is read-only, derived from whichever stage
// first gives it a nonzero Withdrawal Share (see StageCard.vue and
// useStages.ts's effectiveWithdrawalStartAge); a source's is set on the
// source itself. Both are shown purely for visibility, since together they're
// what decides which money is available when.
const portfolio = usePortfolioStore();
const incomeSources = useIncomeSourcesStore();

const accountRows = computed(() =>
  portfolio.accounts.map((meta) => {
    const account = useAccountStore(meta.id);
    const rules = ACCOUNT_TYPE_RULES[account.accountType];
    // Flagged right where the age is set, since this table is where an
    // early start age is actually chosen — the penalty it causes shows up
    // much later, in whichever stage ends up doing the withdrawing.
    const penaltyFreeAge = rules.penaltyFreeWithdrawalAge;
    return {
      id: meta.id,
      name: meta.name,
      icon: ACCOUNT_TYPE_ICONS[account.accountType],
      startAge: account.withdrawalStartAge,
      early:
        penaltyFreeAge !== null &&
        Number.isFinite(account.withdrawalStartAge) &&
        account.withdrawalStartAge < penaltyFreeAge,
      penaltyNote:
        penaltyFreeAge !== null && rules.earlyWithdrawalPenaltyRate !== null
          ? `Starts before this account's penalty-free age of ${penaltyFreeAge} — withdrawals before then pay a ${rules.earlyWithdrawalPenaltyRate}% penalty.`
          : undefined,
      neverNote: 'Never withdraws — toggle it on in some stage',
    };
  })
);

// Guaranteed income never carries an early-withdrawal penalty (it isn't a
// withdrawal), and always has a start age, so it never shows a dash.
const incomeSourceRows = computed(() =>
  incomeSources.sources.map((source) => ({
    id: source.id,
    name: source.name,
    icon: INCOME_SOURCE_TYPE_ICONS[source.type],
    startAge: source.startAge,
    early: false,
    penaltyNote: undefined,
    neverNote: '',
  }))
);

const startAgeRows = computed(() => [...accountRows.value, ...incomeSourceRows.value]);
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

    <div class="grid gap-10 sm:grid-cols-2">
      <div>
        <label class="block text-sm mb-2 text-gray-400" for="intra-retire-growth-input">
          Growth Rate (During Withdrawals)
        </label>
        <p class="text-xs text-gray-400 mb-2">
          Applied to every account once it starts being withdrawn from, regardless of stage — a
          single, shared assumption for the retirement portfolio as a whole.
        </p>
        <div class="relative mt-6 pt-6 max-w-sm">
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

      <div v-if="startAgeRows.length" class="min-w-0">
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-1">When Income Starts</h4>
        <p class="text-xs text-gray-400 mb-3">
          The age each account starts being drawn on, and the age each guaranteed source starts
          paying.
        </p>
        <div class="overflow-x-auto">
          <table class="text-sm border-collapse">
            <thead>
              <tr>
                <th v-for="row in startAgeRows" :key="row.id" class="pb-2 px-3 first:pl-0">
                  <div class="flex flex-col items-center gap-1">
                    <component :is="row.icon" class="text-gray-400" style="width: 16px; height: 16px" />
                    <span class="font-medium truncate max-w-20" :title="row.name">{{ row.name }}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t border-surface-100 dark:border-surface-800">
                <td v-for="row in startAgeRows" :key="row.id" class="pt-1.5 px-3 text-center first:pl-0">
                  <span
                    v-if="Number.isFinite(row.startAge)"
                    class="font-medium"
                    :class="row.early && 'text-amber-500'"
                    :title="row.early ? row.penaltyNote : undefined"
                  >
                    {{ row.startAge }}<template v-if="row.early">*</template>
                  </span>
                  <span v-else class="text-gray-400" :title="row.neverNote">&mdash;</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="startAgeRows.some((r) => r.early)" class="text-xs text-amber-500 mt-2">
            * Starts before this account's penalty-free age, so its withdrawals pay an early-withdrawal penalty.
          </p>
        </div>
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
  </div>
</template>
