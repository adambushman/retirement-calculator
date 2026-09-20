<script setup lang="ts">
import { computed } from 'vue';

import InputNumber from '@/volt/InputNumber.vue';
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

// PrimeVue's InputNumber only writes to v-model on blur/Enter/Tab/arrow-step
// — plain digit-by-digit typing updates the displayed text but leaves the
// bound value (and therefore every computed that depends on it) stale until
// the field loses focus. That's at odds with "instantly update the state"
// for a section with no Done button, so each field below also listens for
// PrimeVue's own eager `input` event (fired on every keystroke) and writes
// straight through immediately.

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

// Growth Rate (During Withdrawals) applies to an account regardless of which
// stage it's in, so it stays here as a single per-account setting rather
// than repeated on every stage card. Withdrawal Start Age isn't a setting at
// all anymore — it's read-only, derived from whichever stage first gives
// this account a nonzero Withdrawal Share (see StageCard.vue and
// useStages.ts's effectiveWithdrawalStartAge), shown next to the account
// name purely for visibility.
const portfolio = usePortfolioStore();
const accountRows = computed(() =>
  portfolio.accounts.map((meta) => {
    const account = useAccountStore(meta.id);
    return {
      id: meta.id,
      name: meta.name,
      typeLabel: ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType,
      typeIcon: ACCOUNT_TYPE_ICONS[account.accountType],
      account,
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
      <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Per-Account Withdrawal Settings</h4>
      <div class="space-y-6">
        <div v-for="row in accountRows" :key="row.id">
          <div class="flex flex-wrap items-center gap-1.5 text-sm font-medium mb-2">
            <span>{{ row.name }}</span>
            <span class="text-gray-400 flex items-center gap-1">
              | <component :is="row.typeIcon" style="width: 14px; height: 14px" /> {{ row.typeLabel }}
            </span>
            <span class="text-gray-400 font-normal text-xs">
              ·
              {{
                Number.isFinite(row.account.withdrawalStartAge)
                  ? `Withdraws from age ${row.account.withdrawalStartAge}`
                  : "Never withdraws — set a Withdrawal Share above 0% on some stage"
              }}
            </span>
          </div>
          <div class="flex flex-wrap gap-4">
            <div>
              <label class="block text-sm mb-2 text-gray-400" :for="`intra-retire-growth-input-${row.id}`">
                Growth Rate (During Withdrawals)
              </label>
              <InputNumber
                v-model.number="row.account.growthRateIntraRetirement"
                @input="$event.value !== null && (row.account.growthRateIntraRetirement = $event.value)"
                :inputId="`intra-retire-growth-input-${row.id}`"
                size="small"
                suffix="%"
                :min="0"
                :max="12"
                :step="0.25"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
