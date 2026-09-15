<script setup lang="ts">
import { onBeforeUnmount } from 'vue';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import InputNumber from '@/volt/InputNumber.vue';
import Slider from '@/volt/Slider.vue';
import SliderLabel from '@/components/SliderLabel.vue';

import {
  usePortfolioAssumptionsStore,
  useDraftPortfolioAssumptionsStore,
  copyAssumptionsFields,
} from '@/stores/usePortfolioAssumptionsStore';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const assumptions = usePortfolioAssumptionsStore();

// Edits are staged on a scratch draft store and only copied onto the real
// store when Done is clicked, matching the account wizard's draft-then-commit
// behavior — closing any other way just discards the draft.
const draft = useDraftPortfolioAssumptionsStore();
copyAssumptionsFields(assumptions, draft);

onBeforeUnmount(() => draft.$dispose());

function cancel() {
  emit('close');
}

function done() {
  copyAssumptionsFields(draft, assumptions);
  assumptions.markDescribed();
  // Save explicitly rather than relying on the persistence subscription,
  // which can miss writes made in the same tick as a store's own creation
  // (only matters the very first time this store is described, but cheap
  // to do unconditionally).
  assumptions.$persist();
  emit('close');
}
</script>

<template>
  <Dialog
    :visible="true"
    @update:visible="cancel"
    modal
    dismissable-mask
    header="Portfolio Assumptions"
    class="max-w-lg w-full"
  >
    <p class="text-sm text-gray-400 mb-4">
      Shared across every account in your portfolio — each account has its own balance, growth
      rate, and withdrawal share on top of these.
    </p>

    <div class="space-y-6">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-annual-income-input">
            Annual Income Today (Gross)
          </label>
          <InputNumber
            v-model.number="draft.annualIncome"
            inputId="portfolio-annual-income-input"
            size="small"
            prefix="$"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-annual-raises-input">
            Annual Raises
          </label>
          <InputNumber
            v-model.number="draft.annualRaises"
            inputId="portfolio-annual-raises-input"
            size="small"
            suffix="%"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-age-today-input">
            Your Age Today
          </label>
          <InputNumber v-model.number="draft.ageToday" inputId="portfolio-age-today-input" size="small" />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-retirement-age-input">
            Retirement Age
          </label>
          <InputNumber
            v-model.number="draft.retirementAge"
            inputId="portfolio-retirement-age-input"
            size="small"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-life-expectancy-input">
            Life Expectancy
          </label>
          <InputNumber
            v-model.number="draft.lifeExpectancy"
            inputId="portfolio-life-expectancy-input"
            size="small"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-annual-inflation-input">
            Annual Inflation
          </label>
          <InputNumber
            v-model.number="draft.annualInflation"
            inputId="portfolio-annual-inflation-input"
            size="small"
            suffix="%"
            :min="0"
            :max="6"
            :step="0.25"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm mb-2 text-gray-400" for="portfolio-stage-length-input">
          Retirement Stage Length (Yrs)
        </label>
        <SliderLabel
          :yearsInGoGo="draft.yearsInGoGo"
          :yearsInSlowGo="draft.yearsInSlowGo"
          :yearsInNoGo="draft.yearsInNoGo"
        />
        <Slider
          v-model="draft.retirementBoundaries"
          class="w-full max-w-sm mt-0"
          inputId="portfolio-stage-length-input"
          range
          :min="draft.retirementAge"
          :max="draft.lifeExpectancy"
        />
      </div>

      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-bridge-rate-input">
            Bridge Withdrawal Rate
          </label>
          <InputNumber
            v-model.number="draft.incomeReplacementBridge"
            inputId="portfolio-bridge-rate-input"
            size="small"
            suffix="%"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-gogo-rate-input">
            Go-Go Withdrawal Rate
          </label>
          <InputNumber
            v-model.number="draft.incomeReplacementGoGo"
            inputId="portfolio-gogo-rate-input"
            size="small"
            suffix="%"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-slowgo-rate-input">
            Slow-Go Withdrawal Rate
          </label>
          <InputNumber
            v-model.number="draft.incomeReplacementSlowGo"
            inputId="portfolio-slowgo-rate-input"
            size="small"
            suffix="%"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="portfolio-nogo-rate-input">
            No-Go Withdrawal Rate
          </label>
          <InputNumber
            v-model.number="draft.incomeReplacementNoGo"
            inputId="portfolio-nogo-rate-input"
            size="small"
            suffix="%"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between w-full">
        <SecondaryButton @click="cancel">Cancel</SecondaryButton>
        <Button @click="done">Done</Button>
      </div>
    </template>
  </Dialog>
</template>
