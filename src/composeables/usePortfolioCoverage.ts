import { computed } from 'vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';

/**
 * Cross-account, portfolio-wide views that no single store can answer on its
 * own — see the "stores stay single-domain, composables handle cross-cutting
 * derived logic" convention.
 */
export function usePortfolioCoverage() {
  const portfolio = usePortfolioStore();
  const assumptions = usePortfolioAssumptionsStore();
  const retirementPlan = useRetirementPlanStore();

  const accounts = computed(() =>
    portfolio.accounts.map((a) => ({ id: a.id, store: useAccountStore(a.id) }))
  );

  const firstStageStartAge = computed(() => retirementPlan.firstStageStartAge ?? assumptions.lifeExpectancy);

  // When the last account finally starts withdrawing — i.e. when the portfolio
  // has no money still accumulating anywhere. Usually just the first stage's
  // start age, but an account that unlocks later keeps compounding untouched
  // past it, so the Accumulation stage can outlast it. An account with no
  // nonzero share anywhere (effectiveWithdrawalStartAge === Infinity) never
  // unlocks at all, so the whole figure is capped at lifeExpectancy rather
  // than letting one such account push it to Infinity.
  const accumulationEndAge = computed<number>(() => {
    const starts = accounts.value.map(({ store }) => store.withdrawalStartAge);
    const raw = starts.length > 0 ? Math.max(firstStageStartAge.value, ...starts) : firstStageStartAge.value;
    return Math.min(raw, assumptions.lifeExpectancy);
  });

  return { accumulationEndAge };
}
