<script setup lang="ts">
import { ref, provide } from 'vue';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import CheckIcon from '@primevue/icons/check';
import StepAccountDetails from '@/components/portfolio/wizard/StepAccountDetails.vue';
import StepEarningSaving from '@/components/portfolio/wizard/StepEarningSaving.vue';
import StepRetirementPlan from '@/components/portfolio/wizard/StepRetirementPlan.vue';
import StepMiscellaneous from '@/components/portfolio/wizard/StepMiscellaneous.vue';

import { useAccountStore } from '@/stores/useAccountStore';
import { AccountStoreKey } from '@/stores/accountStoreKey';

// Only ever mounted (via v-if in PortfolioView) while there's a real account
// being edited, so accountId is always valid for the component's lifetime.
const props = defineProps<{
  accountId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Scope this account's store to every step (which already do
// inject(AccountStoreKey)) the same way AccountCard does for the chart.
const store = useAccountStore(props.accountId);
provide(AccountStoreKey, store);

const steps = ['Account Details', 'Earning & Saving', 'Retirement Plan', 'Miscellaneous'];

const currentStep = ref(0);
// Linear stepper: steps up to here have been visited and can be revisited,
// but nothing beyond the current step can be jumped to.
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
</script>

<template>
  <Dialog
    :visible="true"
    @update:visible="emit('close')"
    modal
    dismissable-mask
    :header="steps[currentStep]"
    class="max-w-2xl w-full"
  >
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

    <StepAccountDetails v-if="currentStep === 0" :account-id="accountId" />
    <StepEarningSaving v-else-if="currentStep === 1" />
    <StepRetirementPlan v-else-if="currentStep === 2" />
    <StepMiscellaneous v-else />

    <template #footer>
      <div class="flex justify-between w-full">
        <SecondaryButton v-if="currentStep > 0" @click="back">Back</SecondaryButton>
        <span v-else />

        <Button v-if="currentStep < steps.length - 1" @click="next">Next</Button>
        <Button v-else @click="emit('close')">Done</Button>
      </div>
    </template>
  </Dialog>
</template>
