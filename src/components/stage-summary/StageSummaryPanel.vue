<script setup lang="ts">
import { computed, inject } from 'vue';
import StageSummary from '@/components/stage-summary/SingleStageSummary.vue';

import { AccountStoreKey } from '@/stores/accountStoreKey';
const store = inject(AccountStoreKey)!;

// Average monthly contribution/withdrawal for a stage: its total flow spread
// across the months the stage actually spans.
const perMonth = (totalFlow: number, years: number) =>
  years > 0 ? totalFlow / years / 12 : 0;

// This account stops contributing at whichever comes first, its own
// withdrawal start age or the portfolio's Retirement Age (see
// useAccountProjection.ts's contributingCutoffAge) — Pre-Retirement always
// ends there, not at the account's own start age.
const contributingCutoffAge = computed(() => Math.min(store.withdrawalStartAge, store.retirementAge));

// A Bridge stage only exists for this account if it starts withdrawing
// before the portfolio-wide Retirement Age.
const hasBridge = computed(() => store.withdrawalStartAge < store.retirementAge);
const bridgeYears = computed(() => Math.max(0, store.retirementAge - store.withdrawalStartAge));
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    <StageSummary
      stage="Pre-Retirement"
      :finalBalance="store.finalPreRetirementBalance"
      :totalFlow="store.totalPreRetirementFlow"
      :avgMonthlyFlow="perMonth(store.totalPreRetirementFlow, store.yearsUntilRetirement)"
      :totalGrowth="store.totalPreRetirementGrowth"
      :years="[store.ageToday, contributingCutoffAge - 1]"
    />

    <StageSummary
      v-if="hasBridge"
      stage="Bridge"
      :finalBalance="store.finalBridgeBalance"
      :totalFlow="store.totalBridgeFlow"
      :avgMonthlyFlow="perMonth(store.totalBridgeFlow, bridgeYears)"
      :totalGrowth="store.totalBridgeGrowth"
      :years="[store.withdrawalStartAge, store.retirementAge - 1]"
    />

    <StageSummary
      stage="Go-Go Years"
      :finalBalance="store.finalGoGoBalance"
      :totalFlow="store.totalGoGoFlow"
      :avgMonthlyFlow="perMonth(store.totalGoGoFlow, store.yearsInGoGo)"
      :totalGrowth="store.totalGoGoGrowth"
      :years="[store.retirementAge, store.retirementBoundaries[0]! - 1]"
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
