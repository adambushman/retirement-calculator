import { computed, type ComputedRef } from 'vue';

import type { FullProjection } from '@/composeables/useProjections';
import { computePortfolioSimulation } from '@/composeables/useAccountProjection';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';

const EMPTY_PROJECTION: FullProjection = { raw: [], 'inflation-adjusted': [] };

// Explicit return type so useAccountStore.ts (which calls this from its own
// `futureProjection` computed) doesn't need to infer through this function's
// body to know its shape — that inference loop is what would otherwise make
// this composable and the account store circularly dependent on each other's
// inferred types (they already depend on each other at the value level, by
// design; see the comment above).
export interface PortfolioSimulationResult {
  projections: ComputedRef<Map<string, FullProjection>>;
  projectionFor: (accountId: string) => FullProjection;
}

/**
 * Runs the shared, cross-account withdrawal simulation (see
 * computePortfolioSimulation) against the portfolio's current accounts and
 * assumptions, and hands back each account's own resulting projection. This
 * is the composable each account store calls (lazily, from within its own
 * `futureProjection` computed) so that one account's withdrawals can be
 * redistributed across its siblings once it depletes — see the "stores stay
 * single-domain, composables handle cross-cutting derived logic" convention.
 */
export function usePortfolioSimulation(): PortfolioSimulationResult {
  const portfolio = usePortfolioStore();
  const assumptions = usePortfolioAssumptionsStore();

  const projections = computed<Map<string, FullProjection>>(() => {
    const accounts = portfolio.accounts.map((meta) => {
      const store = useAccountStore(meta.id);
      return {
        id: meta.id,
        currentBalance: store.currentBalance,
        growthRatePreRetirement: store.growthRatePreRetirement,
        growthRateIntraRetirement: store.growthRateIntraRetirement,
        contributionMode: store.contributionMode,
        firstMonthlyContribution: store.firstMonthlyContribution,
        withdrawalStartAge: store.withdrawalStartAge,
        withdrawalShare: store.withdrawalShare,
      };
    });

    return computePortfolioSimulation(accounts, {
      ageToday: assumptions.ageToday,
      lifeExpectancy: assumptions.lifeExpectancy,
      retirementAge: assumptions.retirementAge,
      annualIncome: assumptions.annualIncome,
      annualRaises: assumptions.annualRaises,
      retirementBoundaries: assumptions.retirementBoundaries,
      incomeReplacementBridge: assumptions.incomeReplacementBridge,
      incomeReplacementGoGo: assumptions.incomeReplacementGoGo,
      incomeReplacementSlowGo: assumptions.incomeReplacementSlowGo,
      incomeReplacementNoGo: assumptions.incomeReplacementNoGo,
      annualInflation: assumptions.annualInflation,
    });
  });

  function projectionFor(accountId: string): FullProjection {
    return projections.value.get(accountId) ?? EMPTY_PROJECTION;
  }

  return { projections, projectionFor };
}
