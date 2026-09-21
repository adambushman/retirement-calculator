<script setup lang="ts">
import { ref, computed, type Component } from 'vue';
import { format } from 'd3-format';

import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_ORDER } from '@/composeables/useAccountTypes';
import { balanceAtAge } from '@/composeables/useProjections';
import { useIncomeSourcesStore } from '@/stores/useIncomeSourcesStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { annuityBalanceAtStart, firstAnnualIncome, type IncomeSource } from '@/composeables/useIncomeSources';
import {
  INCOME_SOURCE_TYPE_ORDER,
  INCOME_SOURCE_TYPE_LABELS,
  INCOME_SOURCE_TYPE_ICONS,
  INCOME_SOURCE_TYPE_RULES,
} from '@/composeables/useIncomeSourceTypes';
import CoinIcon from '@/components/icons/CoinIcon.vue';

const portfolio = usePortfolioStore();
const incomeSourcesStore = useIncomeSourcesStore();
const assumptions = usePortfolioAssumptionsStore();

// Independent of any single account's own "Adjust for Inflation" choice (see
// useAccountStore's inflationAdjChoice) — this toggle governs this table
// only, so "Balance at Future Age" is read fresh from each account's own
// futureProjection under this externally chosen perspective rather than
// whatever that account's own toggle happens to be set to (mirrors
// usePortfolioProjection's convention for the chart/stage breakdown).
const inflationAdjusted = ref(true);
const perspective = computed<'raw' | 'inflation-adjusted'>(() =>
  inflationAdjusted.value ? 'inflation-adjusted' : 'raw'
);

const accountStores = computed(() =>
  portfolio.accounts.map((a) => useAccountStore(a.id))
);

function balanceAtWithdrawalStartFor(store: ReturnType<typeof useAccountStore>): number {
  return balanceAtAge(
    store.futureProjection[perspective.value],
    store.ageToday,
    store.withdrawalStartAge,
    store.currentBalance
  );
}

// One column of the table. A null figure means the row doesn't apply to that
// column (e.g. Social Security has no balance or contributions) and renders
// as an em dash with no percent-of-total beneath it.
interface Column {
  type: string;
  label: string;
  icon: Component;
  count: number;
  monthlyContribution: number | null;
  percentOfContributionTotal: number;
  balanceToday: number | null;
  percentOfTotal: number;
  balanceAtWithdrawalStart: number | null;
  percentOfWithdrawalTotal: number;
  monthlyIncome: number | null;
  percentOfIncomeTotal: number;
}

const sources = computed(() => incomeSourcesStore.sources);

// Restates a source's figure at its own start age under this table's
// inflation toggle (same convention as applyInflationAdjustment).
function inflationToStart(source: IncomeSource): number {
  if (!inflationAdjusted.value) return 1;
  return Math.pow(1 + assumptions.annualInflation / 100, Math.max(0, source.startAge - assumptions.ageToday));
}

// An income source's monthly payment in its first year, and — for the one
// type with a balance, an annuity — that balance right as payments begin.
function monthlyIncomeFor(source: IncomeSource): number {
  return firstAnnualIncome(source, assumptions) / 12 / inflationToStart(source);
}

function balanceAtStartFor(source: IncomeSource): number {
  return annuityBalanceAtStart(source, assumptions) / inflationToStart(source);
}

const accountBalanceToday = computed(() =>
  accountStores.value.reduce((sum, s) => sum + s.currentBalance, 0)
);
const annuities = computed(() => sources.value.filter((s) => INCOME_SOURCE_TYPE_RULES[s.type].hasBalance));

const totalCurrentBalance = computed(
  () => accountBalanceToday.value + annuities.value.reduce((sum, s) => sum + s.currentBalance, 0)
);

const totalMonthlyContribution = computed(
  () =>
    accountStores.value.reduce((sum, s) => sum + s.firstMonthlyContribution, 0) +
    annuities.value.reduce((sum, s) => sum + s.monthlyContribution, 0)
);

const totalBalanceAtWithdrawalStart = computed(
  () =>
    accountStores.value.reduce((sum, s) => sum + balanceAtWithdrawalStartFor(s), 0) +
    annuities.value.reduce((sum, s) => sum + balanceAtStartFor(s), 0)
);

const totalMonthlyIncome = computed(() => sources.value.reduce((sum, s) => sum + monthlyIncomeFor(s), 0));

const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

// One column per account type that's actually in use, rolling every account
// of that type into a single bucket — a first cut at "the portfolio by type"
// that can grow to cover more than these figures later.
const accountBuckets = computed<Column[]>(() =>
  ACCOUNT_TYPE_ORDER.map((type) => {
    const stores = accountStores.value.filter((s) => s.accountType === type);
    const balanceToday = stores.reduce((sum, s) => sum + s.currentBalance, 0);
    const balanceAtWithdrawalStart = stores.reduce((sum, s) => sum + balanceAtWithdrawalStartFor(s), 0);
    const monthlyContribution = stores.reduce((sum, s) => sum + s.firstMonthlyContribution, 0);

    return {
      type,
      label: ACCOUNT_TYPE_LABELS[type],
      icon: ACCOUNT_TYPE_ICONS[type],
      count: stores.length,
      monthlyContribution,
      percentOfContributionTotal: share(monthlyContribution, totalMonthlyContribution.value),
      balanceToday,
      percentOfTotal: share(balanceToday, totalCurrentBalance.value),
      balanceAtWithdrawalStart,
      percentOfWithdrawalTotal: share(balanceAtWithdrawalStart, totalBalanceAtWithdrawalStart.value),
      monthlyIncome: null,
      percentOfIncomeTotal: 0,
    };
  }).filter((bucket) => (bucket.balanceToday ?? 0) > 0 || (bucket.balanceAtWithdrawalStart ?? 0) > 0)
);

// Income sources get a column per type in use, too. Only an annuity carries a
// balance or contributions; Social Security and pensions show a dash there.
const incomeBuckets = computed<Column[]>(() =>
  INCOME_SOURCE_TYPE_ORDER.map((type) => {
    const group = sources.value.filter((s) => s.type === type);
    const hasBalance = INCOME_SOURCE_TYPE_RULES[type].hasBalance;
    const balanceToday = group.reduce((sum, s) => sum + s.currentBalance, 0);
    const balanceAtWithdrawalStart = group.reduce((sum, s) => sum + balanceAtStartFor(s), 0);
    const monthlyContribution = group.reduce((sum, s) => sum + s.monthlyContribution, 0);
    const monthlyIncome = group.reduce((sum, s) => sum + monthlyIncomeFor(s), 0);

    return {
      type,
      label: INCOME_SOURCE_TYPE_LABELS[type],
      icon: INCOME_SOURCE_TYPE_ICONS[type],
      count: group.length,
      monthlyContribution: hasBalance ? monthlyContribution : null,
      percentOfContributionTotal: share(monthlyContribution, totalMonthlyContribution.value),
      balanceToday: hasBalance ? balanceToday : null,
      percentOfTotal: share(balanceToday, totalCurrentBalance.value),
      balanceAtWithdrawalStart: hasBalance ? balanceAtWithdrawalStart : null,
      percentOfWithdrawalTotal: share(balanceAtWithdrawalStart, totalBalanceAtWithdrawalStart.value),
      monthlyIncome,
      percentOfIncomeTotal: share(monthlyIncome, totalMonthlyIncome.value),
    };
  }).filter((bucket) => bucket.count > 0)
);

const hasIncomeSources = computed(() => sources.value.length > 0);

// A trailing "Combined" column rolling up every bucket into the portfolio's
// totals, so the table always shows the whole picture alongside the by-type
// breakdown.
const columns = computed<Column[]>(() => [
  ...accountBuckets.value,
  ...incomeBuckets.value,
  {
    type: 'combined',
    label: 'Combined',
    icon: CoinIcon,
    count: accountStores.value.length + sources.value.length,
    monthlyContribution: totalMonthlyContribution.value,
    percentOfContributionTotal: 100,
    balanceToday: totalCurrentBalance.value,
    percentOfTotal: 100,
    balanceAtWithdrawalStart: totalBalanceAtWithdrawalStart.value,
    percentOfWithdrawalTotal: 100,
    monthlyIncome: totalMonthlyIncome.value,
    percentOfIncomeTotal: 100,
  },
]);

const dollars = format('$.3~s');
const percent = format('.1f');
</script>

<template>
  <div v-if="portfolio.accounts.length">
    <div class="flex justify-end items-center gap-2 mb-5">
      <span class="text-xs lg:text-sm text-gray-400">Adjust for Inflation</span>
      <ToggleSwitch v-model="inflationAdjusted" />
    </div>

    <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr>
          <th></th>
          <th
            v-for="column in columns"
            :key="column.type"
            class="pb-3 px-3"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700'"
          >
            <div class="flex flex-col items-center gap-1.5">
              <component :is="column.icon" class="text-primary" style="width: 22px; height: 22px" />
              <span class="font-semibold">{{ column.label }}</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Number of Accounts</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            {{ column.count }}
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Total Monthly Contribution</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            <template v-if="column.monthlyContribution === null">&mdash;</template>
            <template v-else>
              {{ dollars(column.monthlyContribution) }}
              <span v-if="column.type !== 'combined'" class="block text-xs font-normal text-gray-400">
                {{ percent(column.percentOfContributionTotal) }}%
              </span>
            </template>
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Balance Today</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            <template v-if="column.balanceToday === null">&mdash;</template>
            <template v-else>
              {{ dollars(column.balanceToday) }}
              <span v-if="column.type !== 'combined'" class="block text-xs font-normal text-gray-400">
                {{ percent(column.percentOfTotal) }}%
              </span>
            </template>
          </td>
        </tr>
        <tr class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Balance at Future Age</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            <template v-if="column.balanceAtWithdrawalStart === null">&mdash;</template>
            <template v-else>
              {{ dollars(column.balanceAtWithdrawalStart) }}
              <span v-if="column.type !== 'combined'" class="block text-xs font-normal text-gray-400">
                {{ percent(column.percentOfWithdrawalTotal) }}%
              </span>
            </template>
          </td>
        </tr>
        <tr v-if="hasIncomeSources" class="border-t border-surface-100 dark:border-surface-800">
          <td class="py-2.5 pr-3 text-gray-400 whitespace-nowrap">Monthly Income at Start Age</td>
          <td
            v-for="column in columns"
            :key="column.type"
            class="py-2.5 px-3 text-center font-medium"
            :class="column.type === 'combined' && 'border-l border-surface-200 dark:border-surface-700 font-bold'"
          >
            <template v-if="column.monthlyIncome === null">&mdash;</template>
            <template v-else>
              {{ dollars(column.monthlyIncome) }}
              <span v-if="column.type !== 'combined'" class="block text-xs font-normal text-gray-400">
                {{ percent(column.percentOfIncomeTotal) }}%
              </span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>
