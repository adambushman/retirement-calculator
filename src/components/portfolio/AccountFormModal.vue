<script setup lang="ts">
import { ref, computed, provide, onBeforeUnmount } from 'vue';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import CheckIcon from '@primevue/icons/check';
import StepAccountDetails from '@/components/portfolio/wizard/StepAccountDetails.vue';
import StepEarningSaving from '@/components/portfolio/wizard/StepEarningSaving.vue';
import StepRetirementPlan from '@/components/portfolio/wizard/StepRetirementPlan.vue';

import { useAccountStore, useDraftAccountStore, copyAccountFields } from '@/stores/useAccountStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { AccountStoreKey } from '@/stores/accountStoreKey';

// Omit accountId to create a brand-new account: nothing is added to the
// portfolio until Done is clicked. Pass an existing id to edit it in place.
const props = defineProps<{
  accountId?: string;
}>();

const emit = defineEmits<{
  (e: 'close', createdAccountId?: string): void;
}>();

const portfolio = usePortfolioStore();
const isNew = !props.accountId;

// Every edit happens against a scratch draft store + name, seeded from the
// real account (or from scratch for a new one). Nothing touches the real
// account/portfolio until Done commits it — closing any other way (Cancel,
// the X button, clicking outside) just discards the draft.
const draft = useDraftAccountStore();
const draftName = ref(
  isNew
    ? `Account ${portfolio.accounts.length + 1}`
    : (portfolio.accounts.find((a) => a.id === props.accountId)?.name ?? '')
);

if (props.accountId) {
  copyAccountFields(useAccountStore(props.accountId), draft);
}

provide(AccountStoreKey, draft);

onBeforeUnmount(() => draft.$dispose());

const steps = ['Account Details', 'Earning & Saving', 'Retirement Plan'];

const currentStep = ref(0);
// Linear stepper: steps up to here have been visited and can be revisited,
// but nothing beyond the current step can be jumped to.
const furthestStep = ref(0);

const modalTitle = computed(() =>
  isNew ? 'Add New Retirement Account' : `Edit ${draftName.value || 'Untitled'} Account`
);

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
  if (isNew) {
    const id = portfolio.addAccount(draftName.value);
    const account = useAccountStore(id);
    copyAccountFields(draft, account);
    // A brand-new store's persistence subscription can miss writes that land
    // in the same tick as its own creation, so save explicitly rather than
    // relying on it to pick up copyAccountFields' mutations on its own.
    account.$persist();
    emit('close', id);
  } else {
    portfolio.renameAccount(props.accountId!, draftName.value);
    const account = useAccountStore(props.accountId!);
    copyAccountFields(draft, account);
    account.$persist();
    emit('close');
  }
}
</script>

<template>
  <Dialog :visible="true" @update:visible="cancel" modal dismissable-mask class="max-w-2xl w-full">
    <template #header>
      <div>
        <div class="font-bold text-xl">{{ modalTitle }}</div>
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

    <StepAccountDetails v-if="currentStep === 0" v-model:name="draftName" />
    <StepEarningSaving v-else-if="currentStep === 1" />
    <StepRetirementPlan v-else />

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
