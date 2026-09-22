<script setup lang="ts">
import { computed, ref } from 'vue';
import TrashIcon from '@primevue/icons/trash';
import ChevronDownIcon from '@primevue/icons/chevrondown';
import ChevronUpIcon from '@primevue/icons/chevronup';

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

const props = defineProps<{
  stage: Stage;
  index: number;
}>();

const assumptions = usePortfolioAssumptionsStore();
const retirementPlan = useRetirementPlanStore();
const portfolio = usePortfolioStore();

const endAge = computed(() => stageEndAge(retirementPlan.stages, props.index, assumptions.lifeExpectancy));

// Starts collapsed, matching AccountCard's own default. Local to this card
// (not lifted to a parent-tracked set like AccountCard's expandedIds) since
// there's no "auto-expand the one I just created" need here — a stage is
// already fully live/editable the instant StageFormModal adds it; the user
// can open it themselves.
const collapsed = ref(true);

// The only place this stage's startAge is ever written — moveBoundary
// clamps it between its neighbors and keeps the previous stage's (derived)
// end in sync, so there's nothing else to reconcile here. Both the eager
// `input` event (every keystroke) and the final commit go through it, same
// dual-binding convention as every other live field in this section (see
// RetirementPlanInputs.vue's original comment on why).
function setStartAge(value: number | null) {
  if (value === null) return;
  retirementPlan.moveBoundary(props.stage.id, value);
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
const shareAccounts = computed(() =>
  ACCOUNT_TYPE_ORDER.flatMap((type) =>
    portfolio.accounts
      .map((meta) => ({ id: meta.id, name: meta.name, color: meta.color, store: useAccountStore(meta.id) }))
      .filter((a) => a.store.accountType === type)
      .map((a) => ({ ...a, icon: ACCOUNT_TYPE_ICONS[type] }))
  )
);

// An account is "on" for this stage when it has a share; the shares of the
// accounts that are on always sum to 100 (see useWithdrawalShares.ts).
const shares = computed(() => props.stage.withdrawalShareByAccount);
const isOn = (accountId: string) => accountId in shares.value;
const enabledAccounts = computed(() => shareAccounts.value.filter((a) => isOn(a.id)));

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

    <div v-if="!collapsed" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3 text-sm">Stage Timing & Replacement</h4>
        <div class="flex flex-col gap-4">
          <div>
            <label class="block text-sm mb-2 text-gray-400" :for="`stage-start-age-${stage.id}`">
              Start Age
            </label>
            <InputNumber
              :modelValue="stage.startAge"
              @update:modelValue="(v: number | null) => setStartAge(v)"
              @input="$event.value !== null && setStartAge($event.value)"
              :inputId="`stage-start-age-${stage.id}`"
              size="small"
            />
          </div>

          <div>
            <span class="block text-sm mb-2 text-gray-400">End Age</span>
            <p class="text-sm py-2">{{ endAge }}</p>
          </div>

          <div>
            <label class="block text-sm mb-2 text-gray-400" :for="`stage-rate-${stage.id}`">
              Income Replacement Rate
            </label>
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
            :style="{ '--account-color': account.color }"
          >
            <ToggleSwitch
              :modelValue="isOn(account.id)"
              @update:modelValue="(on: boolean) => retirementPlan.setAccountEnabled(stage.id, account.id, on)"
              :inputId="`stage-share-${stage.id}-${account.id}`"
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
          </div>
        </div>

        <p v-if="!enabledAccounts.length" class="text-xs text-gray-400 mt-3">
          No accounts on — this stage doesn't draw anything from your accounts.
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
