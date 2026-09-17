<script setup lang="ts">
import { computed } from 'vue';

import InputNumber from '@/volt/InputNumber.vue';
import Slider from '@/volt/Slider.vue';
import SliderLabel from '@/components/SliderLabel.vue';

import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/composeables/useAccountTypes';

// Unlike Context/Accounts, this section edits the real portfolio assumptions
// store directly — no draft-then-commit modal — so every change here takes
// effect immediately across the whole app.
const assumptions = usePortfolioAssumptionsStore();

// PrimeVue's InputNumber only writes to v-model on blur/Enter/Tab/arrow-step
// — plain digit-by-digit typing updates the displayed text but leaves the
// bound value (and therefore every computed that depends on it) stale until
// the field loses focus. That's at odds with "instantly update the state"
// for a section with no Done button, so each field below also listens for
// PrimeVue's own eager `input` event (fired on every keystroke) and writes
// straight through immediately.

// Withdrawal Start Age / Withdrawal Share / Growth Rate (During Withdrawals)
// used to be edited on a third "Retirement Plan" step of the account wizard
// (StepRetirementPlan.vue, now removed) and shown on the account's own card.
// Both moved here — reviewing an account's own balance/contribution setup
// shouldn't require thinking about retirement-phase details yet, and this is
// where "how retirement looks" belongs for every account. Since the wizard
// step is gone, this is now the *only* place these fields are editable, so
// each is a live InputNumber straight against the account's own store,
// matching every other field in this section.
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
    <div>
      <label class="block text-sm mb-2 text-gray-400" for="retirement-age-input">
        Retirement Age
      </label>
      <InputNumber
        v-model.number="assumptions.retirementAge"
        @input="$event.value !== null && (assumptions.retirementAge = $event.value)"
        inputId="retirement-age-input"
        size="small"
      />
    </div>

    <div>
      <label class="block text-sm mb-2 text-gray-400" for="retirement-stage-length-input">
        Retirement Stage Length (Yrs)
      </label>
      <SliderLabel
        :yearsInGoGo="assumptions.yearsInGoGo"
        :yearsInSlowGo="assumptions.yearsInSlowGo"
        :yearsInNoGo="assumptions.yearsInNoGo"
      />
      <Slider
        v-model="assumptions.retirementBoundaries"
        class="w-full max-w-sm mt-0"
        inputId="retirement-stage-length-input"
        range
        :min="assumptions.retirementAge"
        :max="assumptions.lifeExpectancy"
      />
    </div>

    <div class="flex flex-wrap gap-4">
      <div>
        <label class="block text-sm mb-2 text-gray-400" for="retirement-bridge-rate-input">
          Bridge Withdrawal Rate
        </label>
        <InputNumber
          v-model.number="assumptions.incomeReplacementBridge"
          @input="$event.value !== null && (assumptions.incomeReplacementBridge = $event.value)"
          inputId="retirement-bridge-rate-input"
          size="small"
          suffix="%"
        />
      </div>

      <div>
        <label class="block text-sm mb-2 text-gray-400" for="retirement-gogo-rate-input">
          Go-Go Withdrawal Rate
        </label>
        <InputNumber
          v-model.number="assumptions.incomeReplacementGoGo"
          @input="$event.value !== null && (assumptions.incomeReplacementGoGo = $event.value)"
          inputId="retirement-gogo-rate-input"
          size="small"
          suffix="%"
        />
      </div>

      <div>
        <label class="block text-sm mb-2 text-gray-400" for="retirement-slowgo-rate-input">
          Slow-Go Withdrawal Rate
        </label>
        <InputNumber
          v-model.number="assumptions.incomeReplacementSlowGo"
          @input="$event.value !== null && (assumptions.incomeReplacementSlowGo = $event.value)"
          inputId="retirement-slowgo-rate-input"
          size="small"
          suffix="%"
        />
      </div>

      <div>
        <label class="block text-sm mb-2 text-gray-400" for="retirement-nogo-rate-input">
          No-Go Withdrawal Rate
        </label>
        <InputNumber
          v-model.number="assumptions.incomeReplacementNoGo"
          @input="$event.value !== null && (assumptions.incomeReplacementNoGo = $event.value)"
          inputId="retirement-nogo-rate-input"
          size="small"
          suffix="%"
        />
      </div>
    </div>

    <div v-if="accountRows.length">
      <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Per-Account Withdrawal Settings</h4>
      <div class="space-y-6">
        <div v-for="row in accountRows" :key="row.id">
          <div class="flex items-center gap-1.5 text-sm font-medium mb-2">
            <span>{{ row.name }}</span>
            <span class="text-gray-400 flex items-center gap-1">
              | <component :is="row.typeIcon" style="width: 14px; height: 14px" /> {{ row.typeLabel }}
            </span>
          </div>
          <div class="flex flex-wrap gap-4">
            <div>
              <label class="block text-sm mb-2 text-gray-400" :for="`withdrawal-start-age-input-${row.id}`">
                Withdrawal Start Age
              </label>
              <InputNumber
                v-model.number="row.account.withdrawalStartAge"
                @input="$event.value !== null && (row.account.withdrawalStartAge = $event.value)"
                :inputId="`withdrawal-start-age-input-${row.id}`"
                size="small"
                :min="row.account.withdrawalStartAgeBounds.min"
                :max="row.account.withdrawalStartAgeBounds.max"
              />
            </div>

            <div>
              <label class="block text-sm mb-2 text-gray-400" :for="`withdrawal-share-input-${row.id}`">
                Withdrawal Share
              </label>
              <InputNumber
                v-model.number="row.account.withdrawalShare"
                @input="$event.value !== null && (row.account.withdrawalShare = $event.value)"
                :inputId="`withdrawal-share-input-${row.id}`"
                size="small"
                suffix="%"
                :min="0"
                :max="100"
              />
            </div>

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
