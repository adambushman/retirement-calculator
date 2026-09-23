<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import TrashIcon from '@primevue/icons/trash';
import ChevronDownIcon from '@primevue/icons/chevrondown';
import ChevronUpIcon from '@primevue/icons/chevronup';
import ExclamationTriangleIcon from '@primevue/icons/exclamationtriangle';
import BanIcon from '@primevue/icons/ban';

import InputNumber from '@/volt/InputNumber.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import ShareSlider from '@/components/portfolio/ShareSlider.vue';

import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_ORDER } from '@/composeables/useAccountTypes';
import { stageEndAge, type Stage } from '@/composeables/useStages';
import { balanceAtAge } from '@/composeables/useProjections';
import { useStageFunding } from '@/composeables/useStageFunding';

// Treat a balance this close to zero as fully depleted — floating-point
// noise from compounding/withdrawing across many years can leave a
// technically-nonzero but meaningless fraction of a cent.
const DEPLETED_THRESHOLD = 0.01;

const props = defineProps<{
  stage: Stage;
  index: number;
}>();

const assumptions = usePortfolioAssumptionsStore();
const retirementPlan = useRetirementPlanStore();
const portfolio = usePortfolioStore();

const endAge = computed(() => stageEndAge(retirementPlan.stages, props.index, assumptions.lifeExpectancy));

// Whether this stage's income-replacement target can actually be paid in
// full by its currently toggled-on accounts — see useStageFunding.ts. Shown
// as a warning icon even while collapsed (matching AccountCard's own
// income-stream warning), so a funding gap is visible without opening the
// card. Deliberately not surfaced as a dollar figure: the shortfall amount
// is a side effect of the underlying problem (a stage that will run dry
// before its End Age, whether from no accounts drawing at all or from
// drawing more than the remaining balances can sustain), not something a
// number by itself explains how to fix.
const { hasShortfall, hasPenalties } = useStageFunding();
const showShortfallWarning = computed(() => hasShortfall(props.stage));

// Penalties are a separate, milder signal than underfunding: the stage is
// still paying for itself, it's just paying more than it needs to. Hence the
// amber warning here against the red stop sign above — and both can show at
// once, since drawing early is a common way to run dry in the first place.
// Deliberately no dollar figure here. The stage card works in nominal
// dollars (like the shortfall figures), while the stage summary below
// follows the Summary section's own inflation toggle — so naming an amount
// in both places would show two different numbers for one thing. The amount
// lives in "Penalties Applied" down there; this just says it's happening
// and what to do about it.
const showPenaltyWarning = computed(() => hasPenalties(props.stage));
const penaltyMessage =
  'Withdrawals here start before age 59½, so this stage pays an early-withdrawal penalty ' +
  '(see "Penalties Applied" in the summary below). Try starting those accounts later, or ' +
  'drawing from a brokerage account instead.';

// Below this, a stage's own replacement rate isn't plausibly the thing to
// cut — a stage already living on a modest slice of the working income runs
// dry because the money was committed upstream, so the lever that's left is
// in the stages before it.
const MODEST_REPLACEMENT_RATE = 75;

// Starts collapsed, matching AccountCard's own default. Local to this card
// (not lifted to a parent-tracked set like AccountCard's expandedIds) since
// there's no "auto-expand the one I just created" need here — a stage is
// already fully live/editable the instant StageFormModal adds it; the user
// can open it themselves.
const collapsed = ref(true);

// The start age deliberately does NOT write on every keystroke, unlike the
// other live fields here. moveBoundary clamps it between the neighboring
// stages, and InputNumber keeps the field's text in its own internal state,
// so clamping a half-typed number and echoing it back fought whoever was
// typing: entering "68" over a selected "60" clamped to the neighbor's
// bound on the "6", then piled the "8" onto that and left the field reading
// "7,488" while the store held something else entirely. InputNumber emits
// `update:modelValue` only on commit (blur or Enter) and `input` on each
// keystroke, so binding the commit alone is exactly the right moment to
// clamp — a half-typed age isn't a meaningful one, and nothing downstream
// should see it.
//
// The field renders from a draft rather than straight from the store so a
// clamped entry still snaps back: typing 80 where the cap is 74 leaves the
// stored age at 74 unchanged, and without a draft to reset there'd be no
// prop change to pull the field off the "80" the user typed.
const startAgeDraft = ref<number | null>(props.stage.startAge);

watch(
  () => props.stage.startAge,
  (age) => {
    startAgeDraft.value = age;
  }
);

async function commitStartAge(value: number | null) {
  // Mirror what was actually typed before correcting it, so that the
  // correction is a change Vue will render. Skipping this leaves the field
  // showing a rejected entry whenever clamping lands on the age already
  // stored — typing 90 into a stage capped at 74 that's already at 74 moves
  // nothing, so resetting the draft to 74 would be a no-op and "90" would
  // just sit there. Same for clearing the field entirely.
  startAgeDraft.value = value;
  if (value !== null) retirementPlan.moveBoundary(props.stage.id, value);
  await nextTick();
  // Re-read rather than trusting what was typed: it may have been clamped,
  // and an emptied field falls back to the age already stored.
  startAgeDraft.value = props.stage.startAge;
}

function remove() {
  if (confirm(`Remove "${props.stage.name || 'this stage'}"? This can't be undone.`)) {
    retirementPlan.removeStage(props.stage.id);
  }
}

// Flattened (not grouped) — still ordered by account type via
// ACCOUNT_TYPE_ORDER, but each row carries its own type icon rather than
// sitting under a separate group header, so the label next to each toggle can
// just be "icon + account name" instead of repeating the type name. The
// slider's segments follow this same order, so they read left to right the
// way the toggles read top to bottom.
//
// Each row also carries whether that account is already run dry by the time
// THIS stage begins — purely a function of Accumulation plus whatever any
// EARLIER stage draws from it, never this stage's own settings (which only
// affect ages at or after this stage's start) — so it's a stable, one-way
// dependency and safe to read directly off the account's own projection.
const shareAccounts = computed(() =>
  ACCOUNT_TYPE_ORDER.flatMap((type) =>
    portfolio.accounts
      .map((meta) => ({ id: meta.id, name: meta.name, color: meta.color, store: useAccountStore(meta.id) }))
      .filter((a) => a.store.accountType === type)
      .map((a) => {
        const balanceAtStageStart = balanceAtAge(
          a.store.futureProjection[a.store.inflationPerspective],
          a.store.ageToday,
          props.stage.startAge,
          a.store.currentBalance
        );
        return {
          ...a,
          icon: ACCOUNT_TYPE_ICONS[type],
          depleted: balanceAtStageStart <= DEPLETED_THRESHOLD,
        };
      })
  )
);

// An account is "on" for this stage when it has a share; the shares of the
// accounts that are on always sum to 100 (see useWithdrawalShares.ts).
const shares = computed(() => props.stage.withdrawalShareByAccount);
const isOn = (accountId: string) => accountId in shares.value;
const enabledAccounts = computed(() => shareAccounts.value.filter((a) => isOn(a.id)));

// An account already toggled on for this stage can still end up depleted by
// the time this stage starts, if an earlier stage's own share was raised
// afterward — self-corrects the same way the store's own share
// normalization does (see useRetirementPlanStore's watcher): idempotent, so
// it settles in one pass instead of looping.
watch(
  shareAccounts,
  (accounts) => {
    for (const account of accounts) {
      if (account.depleted && isOn(account.id)) {
        retirementPlan.setAccountEnabled(props.stage.id, account.id, false);
      }
    }
  },
  { immediate: true }
);

// Names the one lever that still has room to move, rather than listing
// every option each time: an account that's already drawing (or already
// drained before this stage even starts) can't be toggled on, and the first
// stage has no prior stages to rework, so neither is worth suggesting once
// it's exhausted. Lowering this stage's own replacement rate is the last
// resort because it's the only lever that always exists — it changes what
// retirement actually looks like rather than just where the money comes
// from.
const shortfallMessage = computed(() => {
  const drawing = enabledAccounts.value.length;
  const canDrawFromMore = shareAccounts.value.some((a) => !a.depleted && !isOn(a.id));

  let problem: string;
  if (drawing > 0) {
    problem = 'This stage runs out of money before it ends.';
  } else if (canDrawFromMore) {
    problem = "This stage doesn't draw from any account, so nothing replaces the income it targets.";
  } else {
    problem = 'Every account is already drained by the time this stage begins.';
  }

  let suggestion: string;
  if (canDrawFromMore) {
    suggestion = drawing > 0
      ? 'Try drawing from another account as well.'
      : 'Try toggling on an account to begin withdrawals.';
  } else if (props.index > 0 && props.stage.incomeReplacementRate < MODEST_REPLACEMENT_RATE) {
    suggestion = 'Try adjusting the settings in prior stages.';
  } else {
    suggestion = "Try lowering this stage's income replacement rate.";
  }

  return `${problem} ${suggestion}`;
});

// Whether there's anything to say below the two columns at all — kept out of
// the DOM entirely when there isn't, so the card doesn't carry an empty
// row's worth of spacing under the layout.
const hasStageNotes = computed(
  () =>
    shareAccounts.value.length > 0 &&
    (showShortfallWarning.value || showPenaltyWarning.value || enabledAccounts.value.length === 0)
);

const sliderSegments = computed(() =>
  enabledAccounts.value.map((a) => ({ id: a.id, label: a.name, color: a.color, value: shares.value[a.id]! }))
);

function onSharesChange(values: number[]) {
  retirementPlan.setShares(
    props.stage.id,
    Object.fromEntries(enabledAccounts.value.map((a, i) => [a.id, values[i]!]))
  );
}

const textFieldClass =
  'rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950 ' +
  'px-3 py-1.5 text-sm w-full min-w-0 outline-none focus-visible:outline focus-visible:outline-1 ' +
  'focus-visible:outline-primary';
</script>

<template>
  <div
    class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 space-y-4"
    :style="{ borderLeftWidth: '4px', borderLeftColor: stage.color }"
  >
    <div class="flex justify-between gap-4" :class="collapsed ? 'items-center' : 'items-start'">
      <div v-if="collapsed" class="min-w-0">
        <span class="text-lg lg:text-xl font-bold truncate block">{{ stage.name || 'Untitled Stage' }}</span>
        <div class="text-sm lg:text-base text-gray-500">Age {{ stage.startAge }} &rarr; {{ endAge }}</div>
      </div>
      <div v-else class="flex-1 space-y-2">
        <input
          v-model="stage.name"
          type="text"
          placeholder="Stage name"
          aria-label="Stage name"
          :class="textFieldClass"
        />
        <textarea
          v-model="stage.description"
          placeholder="What does this stage look like?"
          rows="2"
          aria-label="Stage description"
          :class="[textFieldClass, 'resize-none']"
        />
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <span v-if="showShortfallWarning" class="p-1.5 text-red-500" :title="shortfallMessage">
          <BanIcon style="width: 14px; height: 14px" />
        </span>
        <span v-if="showPenaltyWarning" class="p-1.5 text-amber-500" :title="penaltyMessage">
          <ExclamationTriangleIcon style="width: 14px; height: 14px" />
        </span>
        <SecondaryButton
          rounded
          :aria-label="collapsed ? `Expand ${stage.name || 'stage'}` : `Collapse ${stage.name || 'stage'}`"
          @click="collapsed = !collapsed"
        >
          <template #icon>
            <ChevronUpIcon v-if="!collapsed" style="width: 14px; height: 14px" />
            <ChevronDownIcon v-else style="width: 14px; height: 14px" />
          </template>
        </SecondaryButton>
        <SecondaryButton rounded :aria-label="`Remove ${stage.name || 'stage'}`" @click="remove">
          <template #icon>
            <TrashIcon style="width: 14px; height: 14px" />
          </template>
        </SecondaryButton>
      </div>
    </div>

    <div v-if="!collapsed" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3 text-sm">Stage Timing & Replacement</h4>
          <div class="flex flex-col gap-4">
            <div>
              <label class="block text-sm mb-2 text-gray-400" :for="`stage-start-age-${stage.id}`">
                Start Age
              </label>
              <InputNumber
                :modelValue="startAgeDraft"
                @update:modelValue="(v: number | null) => commitStartAge(v)"
                :inputId="`stage-start-age-${stage.id}`"
                :useGrouping="false"
                size="small"
              />
            </div>

            <div>
              <span class="block text-sm mb-2 text-gray-400">End Age</span>
              <p class="text-sm py-2">{{ endAge }}</p>
            </div>

            <div>
              <label class="block text-sm mb-1 text-gray-400" :for="`stage-rate-${stage.id}`">
                Income Replacement Rate
              </label>
              <p class="text-xs text-gray-400 mb-2">
                The share of your career income this stage lives on. Guaranteed income counts
                toward it first — your accounts fund what's left.
              </p>
              <InputNumber
                v-model.number="stage.incomeReplacementRate"
                @input="$event.value !== null && (stage.incomeReplacementRate = $event.value)"
                :inputId="`stage-rate-${stage.id}`"
                size="small"
                suffix="%"
                :min="0"
              />
            </div>
          </div>
        </div>

        <div v-if="shareAccounts.length">
          <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-1 text-sm">
            Withdrawal Share by Account
          </h4>
          <p class="text-xs text-gray-400 mb-4">
            Toggle on the accounts this stage draws from, then drag the handles to split the income it
            replaces between them.
          </p>

          <ShareSlider class="mb-4" :segments="sliderSegments" @change="onSharesChange" />

          <div class="space-y-2">
            <div
              v-for="account in shareAccounts"
              :key="account.id"
              class="share-toggle flex items-center gap-3"
              :class="account.depleted && 'opacity-60'"
              :style="{ '--account-color': account.color }"
              :title="account.depleted ? 'No funds left in this account by the time this stage begins' : undefined"
            >
              <ToggleSwitch
                :modelValue="isOn(account.id)"
                @update:modelValue="(on: boolean) => retirementPlan.setAccountEnabled(stage.id, account.id, on)"
                :inputId="`stage-share-${stage.id}-${account.id}`"
                :disabled="account.depleted"
              />
              <label
                class="flex items-center gap-1 text-sm min-w-0"
                :class="isOn(account.id) ? '' : 'text-gray-400'"
                :for="`stage-share-${stage.id}-${account.id}`"
              >
                <component :is="account.icon" class="shrink-0" style="width: 12px; height: 12px" />
                <span class="truncate">{{ account.name }}</span>
              </label>
              <span v-if="isOn(account.id)" class="ml-auto text-sm font-medium tabular-nums">
                {{ shares[account.id] }}%
              </span>
              <span v-else-if="account.depleted" class="ml-auto text-xs text-gray-400">depleted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Full width, below both columns: these messages are prose rather
           than a field, and reading them in a half-width column forced them
           into five or six short lines right under the toggles. -->
      <div v-if="hasStageNotes" class="mt-10 space-y-2">
        <p v-if="showShortfallWarning" class="text-sm text-red-500">
          {{ shortfallMessage }}
        </p>
        <p v-else-if="!enabledAccounts.length" class="text-sm text-gray-400">
          No accounts on — this stage doesn't draw anything from your accounts.
        </p>
        <p v-if="showPenaltyWarning" class="text-sm text-amber-500">
          {{ penaltyMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Each account's toggle turns that account's own color when on, matching its
   segment in the share slider. */
.share-toggle :deep([data-pc-name='toggleswitch'][data-p-checked='true'] [data-pc-section='slider']) {
  background-color: var(--account-color) !important;
}
</style>
