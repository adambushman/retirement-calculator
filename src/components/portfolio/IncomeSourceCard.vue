<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { format } from 'd3-format';
import ChevronDownIcon from '@primevue/icons/chevrondown';
import ChevronUpIcon from '@primevue/icons/chevronup';

import Panel from '@/volt/Panel.vue';
import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import AccountSectionHeader from '@/components/AccountSectionHeader.vue';
import { useIncomeSourcesStore } from '@/stores/useIncomeSourcesStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { annuityBalanceAtStart, firstAnnualIncome, lifetimeIncome } from '@/composeables/useIncomeSources';
import {
  INCOME_SOURCE_TYPE_LABELS,
  INCOME_SOURCE_TYPE_ICONS,
  INCOME_SOURCE_TYPE_RULES,
} from '@/composeables/useIncomeSourceTypes';

const props = defineProps<{
  sourceId: string;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:collapsed', value: boolean): void;
  (e: 'edit', sourceId: string): void;
}>();

const store = useIncomeSourcesStore();
const assumptions = usePortfolioAssumptionsStore();

const source = computed(() => store.sources.find((s) => s.id === props.sourceId));
const rules = computed(() => (source.value ? INCOME_SOURCE_TYPE_RULES[source.value.type] : null));

const typeLabel = computed(() => (source.value ? INCOME_SOURCE_TYPE_LABELS[source.value.type] : ''));
const typeIcon = computed(() => (source.value ? INCOME_SOURCE_TYPE_ICONS[source.value.type] : null));

const dollars = format('$,.0f');
const compactDollars = format('$.3~s');
const percent = format('.2~f');
const age = format('.1~f');

// Independent of every other "Adjust for Inflation" toggle on the page — this
// one only restates this card's own figures. On by default so a benefit reads
// in today's dollars, the way a statement quotes it.
const inflationAdjusted = ref(true);

// Cumulative inflation between today and the age payments begin — dividing a
// nominal figure at that age by this restates it in today's purchasing power
// (the same convention as applyInflationAdjustment in useProjections.ts).
const inflationToStart = computed(() =>
  source.value
    ? Math.pow(1 + assumptions.annualInflation / 100, Math.max(0, source.value.startAge - assumptions.ageToday))
    : 1
);
const adjustment = computed(() => (inflationAdjusted.value ? inflationToStart.value : 1));

const monthlyIncomeAtStart = computed(() =>
  source.value ? firstAnnualIncome(source.value, assumptions) / 12 / adjustment.value : 0
);
const balanceAtStart = computed(() =>
  source.value ? annuityBalanceAtStart(source.value, assumptions) / adjustment.value : 0
);
const lifetimeTotal = computed(() =>
  source.value ? lifetimeIncome(source.value, assumptions, inflationAdjusted.value) : 0
);

const detailsRows = computed(() => [
  { label: 'Type', value: typeLabel.value },
  { label: 'Owner', value: source.value?.ownerName || 'Unassigned' },
]);

const paymentRows = computed(() => {
  const s = source.value;
  if (!s) return [];
  const rows: { label: string; value: string }[] = [];
  if (rules.value?.hasBalance) {
    rows.push(
      { label: 'Balance Today', value: dollars(s.currentBalance) },
      { label: 'Monthly Contribution', value: `${dollars(s.monthlyContribution)}/mo` },
      { label: 'Growth Rate (Before Payments)', value: `${percent(s.growthRate)}%` },
      { label: 'Annual Payout Rate', value: `${percent(s.payoutRate)}%` }
    );
  } else {
    rows.push({ label: "Monthly Benefit (Today's Dollars)", value: `${dollars(s.monthlyBenefit)}/mo` });
  }
  rows.push(
    { label: 'Payments Begin at Age', value: age(s.startAge) },
    { label: 'Annual Increase (COLA)', value: `${percent(s.cola)}%` }
  );
  return rows;
});

const taxRows = computed(() => [{ label: 'Payments Taxed', value: rules.value?.paymentTaxTreatment ?? '' }]);
const paymentRuleRows = computed(() => [{ label: 'Payments Last', value: rules.value?.paymentDuration ?? '' }]);

function toggle() {
  emit('update:collapsed', !props.collapsed);
}

function remove() {
  if (source.value && confirm(`Remove "${source.value.name}"? This can't be undone.`)) {
    store.removeSource(props.sourceId);
  }
}

// Menu actions
const menuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);

function onEdit() {
  menuOpen.value = false;
  emit('edit', props.sourceId);
}

function onDelete() {
  menuOpen.value = false;
  remove();
}

function onDocPointerDown(e: PointerEvent) {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(e.target as Node)) {
    menuOpen.value = false;
  }
}
document.addEventListener('pointerdown', onDocPointerDown, true);
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true));
</script>

<template>
  <Panel v-if="source">
    <template #header>
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-lg lg:text-xl font-bold truncate max-w-48">{{ source.name }}</span>
        <span class="flex items-center gap-1.5 text-lg lg:text-xl font-bold text-gray-400 shrink-0">
          <span>|</span>
          <component :is="typeIcon" style="width: 18px; height: 18px" />
          {{ typeLabel }}
        </span>
      </div>
    </template>

    <template #icons>
      <div class="flex items-center gap-1">
        <div ref="menuRoot" class="relative">
          <button
            type="button"
            @click.stop="menuOpen = !menuOpen"
            aria-label="Income source actions"
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
            </svg>
          </button>

          <div
            v-if="menuOpen"
            class="absolute right-0 mt-1 w-32 py-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-lg z-10"
          >
            <button
              type="button"
              @click="onEdit"
              class="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Edit
            </button>
            <button
              type="button"
              @click="onDelete"
              class="block w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Delete
            </button>
          </div>
        </div>

        <button
          type="button"
          @click.stop="toggle"
          :aria-label="collapsed ? 'Expand income source' : 'Collapse income source'"
          class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <ChevronUpIcon v-if="!collapsed" style="width: 14px; height: 14px" />
          <ChevronDownIcon v-else style="width: 14px; height: 14px" />
        </button>
      </div>
    </template>

    <div class="flex items-center gap-2 text-sm lg:text-base text-gray-500 -mt-3">
      <span class="text-emerald-500">{{ compactDollars(monthlyIncomeAtStart) }}/mo</span>
      <span>from age {{ age(source.startAge) }}</span>
    </div>

    <div v-if="!collapsed" class="space-y-6">
      <AccountSectionHeader title="Facts" class="w-full mt-6">
        <p class="text-sm text-gray-400 mb-4">{{ rules?.taxDescription }}</p>
        <div class="grid gap-10 sm:grid-cols-2">
          <div>
            <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Tax Treatment</h4>
            <table class="w-full text-sm border-collapse">
              <tbody>
                <tr v-for="row in taxRows" :key="row.label" class="border-b border-surface-100 dark:border-surface-800 last:border-0">
                  <td class="py-1.5 pr-2 text-gray-400 align-top">{{ row.label }}</td>
                  <td class="py-1.5 font-medium text-right">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Payment Rules</h4>
            <table class="w-full text-sm border-collapse">
              <tbody>
                <tr v-for="row in paymentRuleRows" :key="row.label" class="border-b border-surface-100 dark:border-surface-800 last:border-0">
                  <td class="py-1.5 pr-2 text-gray-400 align-top">{{ row.label }}</td>
                  <td class="py-1.5 font-medium text-right">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </AccountSectionHeader>

      <AccountSectionHeader title="Assumptions" class="w-full">
        <div class="grid gap-10 sm:grid-cols-2">
          <div>
            <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Details</h4>
            <table class="w-full text-sm border-collapse">
              <tbody>
                <tr
                  v-for="row in detailsRows"
                  :key="row.label"
                  class="border-b border-surface-100 dark:border-surface-800 last:border-0"
                >
                  <td class="py-1.5 pr-2 text-gray-400 align-top">{{ row.label }}</td>
                  <td class="py-1.5 font-medium text-right">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 class="font-semibold text-surface-500 dark:text-surface-400 mb-3">Payments</h4>
            <table class="w-full text-sm border-collapse">
              <tbody>
                <tr
                  v-for="row in paymentRows"
                  :key="row.label"
                  class="border-b border-surface-100 dark:border-surface-800 last:border-0"
                >
                  <td class="py-1.5 pr-2 text-gray-400 align-top">{{ row.label }}</td>
                  <td class="py-1.5 font-medium text-right">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </AccountSectionHeader>

      <AccountSectionHeader title="Potential" class="w-full">
        <template #actions>
          <span class="text-xs lg:text-sm text-gray-400">Adjust for Inflation</span>
          <ToggleSwitch v-model="inflationAdjusted" />
        </template>

        <div
          class="grid grid-cols-1 gap-4 text-center"
          :class="rules?.hasBalance ? 'sm:grid-cols-3' : 'sm:grid-cols-2'"
        >
          <div v-if="rules?.hasBalance">
            <h2 class="text-lg lg:text-2xl font-bold">{{ compactDollars(balanceAtStart) }}</h2>
            <p class="text-xs lg:text-sm text-gray-500">Balance at Age {{ age(source.startAge) }}</p>
          </div>

          <div>
            <h2 class="text-lg lg:text-2xl font-bold">{{ compactDollars(monthlyIncomeAtStart) }}</h2>
            <p class="text-xs lg:text-sm text-gray-500">Monthly Income at Age {{ age(source.startAge) }}</p>
          </div>

          <div>
            <h2 class="text-lg lg:text-2xl font-bold">{{ compactDollars(lifetimeTotal) }}</h2>
            <p class="text-xs lg:text-sm text-gray-500">Total Income Through Age {{ assumptions.lifeExpectancy }}</p>
          </div>
        </div>
      </AccountSectionHeader>
    </div>
  </Panel>
</template>
