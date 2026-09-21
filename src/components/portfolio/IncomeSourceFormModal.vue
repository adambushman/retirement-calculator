<script setup lang="ts">
import { reactive, computed } from 'vue';
import { format } from 'd3-format';

import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import InputNumber from '@/volt/InputNumber.vue';

import { useIncomeSourcesStore } from '@/stores/useIncomeSourcesStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { annuityBalanceAtStart, firstAnnualIncome, type IncomeSource, type IncomeSourceType } from '@/composeables/useIncomeSources';
import {
  INCOME_SOURCE_TYPE_LABELS,
  INCOME_SOURCE_TYPE_RULES,
  defaultIncomeSource,
} from '@/composeables/useIncomeSourceTypes';

// Pass `sourceId` to edit an existing source in place, or `type` to create a
// new one. Either way every edit happens against a local draft and only
// reaches the store when Done is clicked — closing any other way discards it,
// same as the account wizard (AccountFormModal.vue).
const props = defineProps<{
  sourceId?: string;
  type?: IncomeSourceType;
}>();

const emit = defineEmits<{
  (e: 'close', createdSourceId?: string): void;
}>();

const store = useIncomeSourcesStore();
const assumptions = usePortfolioAssumptionsStore();

const existing = props.sourceId ? store.sources.find((s) => s.id === props.sourceId) : undefined;
const isNew = !existing;

const draft = reactive<Omit<IncomeSource, 'id'>>(
  existing
    ? { ...existing }
    : defaultIncomeSource(
        props.type ?? 'social-security',
        assumptions,
        store.sources.filter((s) => s.type === (props.type ?? 'social-security')).length
      )
);

const rules = computed(() => INCOME_SOURCE_TYPE_RULES[draft.type]);
const typeLabel = computed(() => INCOME_SOURCE_TYPE_LABELS[draft.type]);

const modalTitle = computed(() => (isNew ? `Add ${typeLabel.value}` : `Edit ${draft.name || typeLabel.value}`));

// Social Security can only start between 62 and 70; anything else is bounded
// only by the household's own timeline. Never earlier than today.
const startAgeMin = computed(() => Math.max(rules.value.startAgeMin ?? assumptions.ageToday, assumptions.ageToday));
const startAgeMax = computed(() =>
  Math.max(startAgeMin.value, Math.min(rules.value.startAgeMax ?? Infinity, assumptions.lifeExpectancy - 1))
);

const dollars = format('$,.0f');

// A preview so the figure the engine will actually use is never a surprise:
// the first year's payment, and (for an annuity) the balance it comes from.
const firstMonthlyPayment = computed(() => firstAnnualIncome({ ...draft, id: '' }, assumptions) / 12);
const balanceAtStart = computed(() => annuityBalanceAtStart({ ...draft, id: '' }, assumptions));

const textFieldClass =
  'rounded-md border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950 ' +
  'px-3 py-1.5 text-sm w-full outline-none focus-visible:outline focus-visible:outline-1 ' +
  'focus-visible:outline-primary';

function cancel() {
  emit('close');
}

function done() {
  const fields = { ...draft, name: draft.name.trim() || typeLabel.value };
  if (isNew) {
    emit('close', store.addSource(fields));
  } else {
    store.updateSource(props.sourceId!, fields);
    emit('close');
  }
}
</script>

<template>
  <Dialog :visible="true" @update:visible="cancel" modal dismissable-mask class="max-w-2xl w-full">
    <template #header>
      <div>
        <div class="font-bold text-xl">{{ modalTitle }}</div>
        <div class="text-sm font-normal text-gray-400 mt-0.5">{{ typeLabel }}</div>
      </div>
    </template>

    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row gap-6">
        <div class="flex-1 min-w-0">
          <label class="block text-sm mb-2 text-gray-400" for="income-source-name-input">Name</label>
          <input id="income-source-name-input" v-model="draft.name" type="text" :class="textFieldClass" />
        </div>
        <div class="flex-1 min-w-0">
          <label class="block text-sm mb-2 text-gray-400" for="income-source-owner-input">Owner</label>
          <input id="income-source-owner-input" v-model="draft.ownerName" type="text" :class="textFieldClass" />
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <div v-if="!rules.hasBalance">
          <label class="block text-sm mb-2 text-gray-400" for="income-source-benefit-input">
            Monthly Benefit (Today's Dollars)
          </label>
          <InputNumber
            v-model.number="draft.monthlyBenefit"
            inputId="income-source-benefit-input"
            size="small"
            prefix="$"
            :min="0"
          />
        </div>

        <template v-else>
          <div>
            <label class="block text-sm mb-2 text-gray-400" for="income-source-balance-input">
              Balance Today
            </label>
            <InputNumber
              v-model.number="draft.currentBalance"
              inputId="income-source-balance-input"
              size="small"
              prefix="$"
              :min="0"
            />
          </div>
          <div>
            <label class="block text-sm mb-2 text-gray-400" for="income-source-contribution-input">
              Monthly Contribution
            </label>
            <InputNumber
              v-model.number="draft.monthlyContribution"
              inputId="income-source-contribution-input"
              size="small"
              prefix="$"
              :min="0"
            />
          </div>
          <div>
            <label class="block text-sm mb-2 text-gray-400" for="income-source-growth-input">
              Growth Rate (Before Payments)
            </label>
            <InputNumber
              v-model.number="draft.growthRate"
              inputId="income-source-growth-input"
              size="small"
              suffix="%"
              :min="0"
              :max="15"
              :step="0.25"
            />
          </div>
          <div>
            <label class="block text-sm mb-2 text-gray-400" for="income-source-payout-input">
              Annual Payout Rate
            </label>
            <InputNumber
              v-model.number="draft.payoutRate"
              inputId="income-source-payout-input"
              size="small"
              suffix="%"
              :min="0"
              :max="20"
              :step="0.25"
            />
          </div>
        </template>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="income-source-start-age-input">
            Payments Begin at Age
          </label>
          <InputNumber
            v-model.number="draft.startAge"
            inputId="income-source-start-age-input"
            size="small"
            :min="startAgeMin"
            :max="startAgeMax"
            :step="0.5"
            :minFractionDigits="0"
            :maxFractionDigits="1"
          />
        </div>

        <div>
          <label class="block text-sm mb-2 text-gray-400" for="income-source-cola-input">
            Annual Increase (COLA)
          </label>
          <InputNumber
            v-model.number="draft.cola"
            inputId="income-source-cola-input"
            size="small"
            suffix="%"
            :min="0"
            :max="10"
            :step="0.25"
          />
        </div>
      </div>

      <div class="text-sm text-gray-400 space-y-1">
        <p v-if="rules.hasBalance">
          Balance at age {{ draft.startAge }}: <span class="font-medium text-surface-700 dark:text-surface-0">{{ dollars(balanceAtStart) }}</span>
        </p>
        <p>
          First year of payments: <span class="font-medium text-surface-700 dark:text-surface-0">≈ {{ dollars(firstMonthlyPayment) }}/mo</span>
          (in the dollars of that year, before any inflation adjustment).
        </p>
        <p v-if="!rules.hasBalance" class="text-xs">
          Enter the monthly benefit as your statement shows it, in today's dollars — it's carried forward with
          inflation to the age payments begin.
        </p>
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
