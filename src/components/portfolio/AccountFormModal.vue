<script setup lang="ts">
import { ref, computed, provide, onBeforeUnmount } from 'vue';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import StepAccountDetails from '@/components/portfolio/wizard/StepAccountDetails.vue';
import StepEarningSaving from '@/components/portfolio/wizard/StepEarningSaving.vue';

import { useAccountStore, useDraftAccountStore, copyAccountFields, type AccountType } from '@/stores/useAccountStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { AccountStoreKey } from '@/stores/accountStoreKey';
import { ACCOUNT_TYPE_LABELS } from '@/composeables/useAccountTypes';

// Omit accountId to create a brand-new account: nothing is added to the
// portfolio until Done is clicked. Pass an existing id to edit it in place.
//
// `accountType` presets the type for a new account, since it's now picked
// from the "+" menu rather than inside the form (see AddAccountMenu.vue).
// It's optional because the empty-state "Add Account" button opens the form
// without going through that menu — and in that case the form still has to
// offer the choice itself.
const props = defineProps<{
  accountId?: string;
  accountType?: AccountType;
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
} else if (props.accountType) {
  draft.accountType = props.accountType;
}

// The type picker only appears when the type isn't already settled: editing
// an existing account (so a mis-chosen type stays fixable) or creating one
// without having picked from the menu. Showing it on a brand-new account
// that was just started as, say, a Roth would only ask the same question
// twice.
const showTypePicker = !props.accountType || !isNew;

provide(AccountStoreKey, draft);

onBeforeUnmount(() => draft.$dispose());

// Withdrawal Start Age / Withdrawal Share / Growth Rate (During Withdrawals)
// used to be a third "Retirement Plan" step here, but those now live (and
// are edited) in the portfolio-wide Retirement Plan section instead — see
// RetirementPlanInputs.vue's "Per-Account Withdrawal Settings".
//
// Account Details and Earning & Saving used to be two wizard steps. With the
// type chosen up front in the "+" menu, what's left fits on one screen, and
// a single form matches how a guaranteed income source is added (see
// IncomeSourceFormModal.vue).
const modalTitle = computed(() => {
  // Just the name: appending "Account" reads badly against the default
  // names, which already contain the word ("Edit Account 1 Account").
  if (!isNew) return `Edit ${draftName.value || 'Untitled Account'}`;
  return props.accountType ? `Add ${ACCOUNT_TYPE_LABELS[props.accountType]} Account` : 'Add New Account';
});

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
      <div class="font-bold text-xl">{{ modalTitle }}</div>
    </template>

    <div class="space-y-8">
      <StepAccountDetails v-model:name="draftName" :showTypePicker="showTypePicker" />
      <StepEarningSaving />
    </div>

    <template #footer>
      <div class="flex justify-between w-full">
        <SecondaryButton @click="cancel">Cancel</SecondaryButton>
        <Button @click="done">Done</Button>
      </div>
    </template>
  </Dialog>
</template>
