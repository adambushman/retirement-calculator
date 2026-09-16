<script setup lang="ts">
import InputNumber from '@/volt/InputNumber.vue';
import Slider from '@/volt/Slider.vue';
import SliderLabel from '@/components/SliderLabel.vue';

import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';

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
  </div>
</template>
