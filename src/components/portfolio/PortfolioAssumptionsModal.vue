<script setup lang="ts">
import { reactive } from 'vue';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import InputNumber from '@/volt/InputNumber.vue';

import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const assumptions = usePortfolioAssumptionsStore();

// Edits are staged here and only copied onto the real store when Done is
// clicked, matching the account wizard's draft-then-commit behavior.
const draft = reactive({
  annualIncome: assumptions.annualIncome,
  annualRaises: assumptions.annualRaises,
  ageToday: assumptions.ageToday,
  lifeExpectancy: assumptions.lifeExpectancy,
  annualInflation: assumptions.annualInflation,
});

function cancel() {
  emit('close');
}

function done() {
  assumptions.annualIncome = draft.annualIncome;
  assumptions.annualRaises = draft.annualRaises;
  assumptions.ageToday = draft.ageToday;
  assumptions.lifeExpectancy = draft.lifeExpectancy;
  assumptions.annualInflation = draft.annualInflation;
  assumptions.markDescribed();
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
      rates, and withdrawal plan on top of these.
    </p>

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

    <template #footer>
      <div class="flex justify-between w-full">
        <SecondaryButton @click="cancel">Cancel</SecondaryButton>
        <Button @click="done">Done</Button>
      </div>
    </template>
  </Dialog>
</template>
