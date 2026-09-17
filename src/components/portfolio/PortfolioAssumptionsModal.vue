<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { format } from 'd3-format';
import PlusIcon from '@primevue/icons/plus';
import TrashIcon from '@primevue/icons/trash';
import CheckIcon from '@primevue/icons/check';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import InputNumber from '@/volt/InputNumber.vue';

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

const steps = ['Basics', 'Income'];

const currentStep = ref(0);
// Linear stepper: steps up to here have been visited and can be revisited,
// but nothing beyond the current step can be jumped to — same convention as
// the account wizard (AccountFormModal.vue).
const furthestStep = ref(0);

function goTo(index: number) {
  if (index <= furthestStep.value) currentStep.value = index;
}

function next() {
  if (currentStep.value >= steps.length - 1) return;
  currentStep.value += 1;
  furthestStep.value = Math.max(furthestStep.value, currentStep.value);
}

function back() {
  if (currentStep.value > 0) currentStep.value -= 1;
}

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

const dollars = format('$,.0f');
</script>

<template>
  <Dialog :visible="true" @update:visible="cancel" modal dismissable-mask class="max-w-2xl w-full">
    <template #header>
      <div>
        <div class="font-bold text-xl">Portfolio Assumptions</div>
        <div class="text-sm font-normal text-gray-400 mt-0.5">{{ steps[currentStep] }}</div>
      </div>
    </template>

    <div class="flex items-center mb-6">
      <template v-for="(step, i) in steps" :key="step">
        <button
          type="button"
          :disabled="i > furthestStep"
          @click="goTo(i)"
          class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium shrink-0 transition-colors
            disabled:cursor-not-allowed"
          :class="i === currentStep
            ? 'bg-primary text-primary-contrast'
            : i < furthestStep
              ? 'bg-primary-100 dark:bg-primary/20 text-primary'
              : 'bg-surface-100 dark:bg-surface-800 text-gray-400'"
          :aria-label="`Go to step ${i + 1}: ${step}`"
          :aria-current="i === currentStep ? 'step' : undefined"
        >
          <CheckIcon v-if="i < furthestStep" style="width: 12px; height: 12px" />
          <template v-else>{{ i + 1 }}</template>
        </button>
        <div
          v-if="i < steps.length - 1"
          class="flex-1 h-px mx-1"
          :class="i < furthestStep ? 'bg-primary-200 dark:bg-primary/30' : 'bg-surface-200 dark:bg-surface-700'"
        />
      </template>
    </div>

    <div v-if="currentStep === 0" class="space-y-4">
      <p class="text-sm text-gray-400">
        Shared across every account in your portfolio — each account has its own balance, growth
        rate, and withdrawal share on top of these. Retirement-plan specifics (retirement age,
        stage lengths, withdrawal rates) live in the Retirement Plan section below.
      </p>

      <div class="flex flex-wrap gap-4">
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
    </div>

    <div v-else class="space-y-4">
      <p class="text-sm text-gray-400">
        Every source of income you (or your household) expect — a job, a side gig, a partner's
        income. Annual Income is the sum of these; each stream also gets its own raise rate, since
        different income sources don't necessarily grow at the same pace.
      </p>

      <div
        v-for="(stream, i) in draft.incomeStreams"
        :key="stream.id"
        class="flex flex-wrap items-end gap-4 pb-4 border-b border-surface-100 dark:border-surface-800 last:border-0 last:pb-0"
      >
        <div class="flex-1 min-w-[140px]">
          <label class="block text-sm mb-2 text-gray-400" :for="`income-name-input-${stream.id}`">
            Name
          </label>
          <input
            :id="`income-name-input-${stream.id}`"
            v-model="stream.name"
            type="text"
            class="rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950
              px-3 py-1.5 text-sm w-full outline-none focus-visible:outline focus-visible:outline-1
              focus-visible:outline-primary"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" :for="`income-amount-input-${stream.id}`">
            Annual Amount
          </label>
          <InputNumber
            v-model.number="stream.annualAmount"
            :inputId="`income-amount-input-${stream.id}`"
            size="small"
            prefix="$"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" :for="`income-raises-input-${stream.id}`">
            Annual Raises
          </label>
          <InputNumber
            v-model.number="stream.annualRaises"
            :inputId="`income-raises-input-${stream.id}`"
            size="small"
            suffix="%"
          />
        </div>

        <SecondaryButton
          rounded
          :aria-label="`Remove ${stream.name || 'income stream'}`"
          :disabled="draft.incomeStreams.length <= 1"
          @click="draft.removeIncomeStream(stream.id)"
        >
          <template #icon>
            <TrashIcon style="width: 14px; height: 14px" />
          </template>
        </SecondaryButton>
      </div>

      <SecondaryButton label="Add Income Stream" @click="draft.addIncomeStream()">
        <template #icon>
          <PlusIcon style="width: 14px; height: 14px" />
        </template>
      </SecondaryButton>

      <p class="text-sm text-gray-400 pt-2 border-t border-surface-100 dark:border-surface-800">
        Total Annual Income: <span class="font-semibold text-gray-200">{{ dollars(draft.annualIncome) }}</span>
      </p>
    </div>

    <template #footer>
      <div class="flex justify-between w-full">
        <SecondaryButton v-if="currentStep === 0" @click="cancel">Cancel</SecondaryButton>
        <SecondaryButton v-else @click="back">Back</SecondaryButton>

        <Button v-if="currentStep < steps.length - 1" @click="next">Next</Button>
        <Button v-else @click="done">Done</Button>
      </div>
    </template>
  </Dialog>
</template>
