import { computed, type Ref } from 'vue';

import type { AnnualProjection } from '@/composeables/useProjections';
import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { ACCUMULATION_ID } from '@/composeables/useStages';

export interface PortfolioProjectionRow {
  age: number;
  accountId: string;
  accountName: string;
  /** A stage id, or ACCUMULATION_ID — resolve display name/color by id lookup. */
  stage: string;
  /** This account's own end balance that year — stacking every account's
   * row for a given age yields the portfolio's combined balance. */
  balance: number;
  annualFlow: number;
  totalGrowth: number;
}

export interface StageAggregate {
  stage: string;
  finalBalance: number;
  totalFlow: number;
  totalGrowth: number;
}

/**
 * Combines every account's own year-by-year projection into one
 * portfolio-wide view — per-account-per-year rows for a stacked chart, and
 * per-stage totals for a combined stage breakdown. Independent of any single
 * account's own "Adjust for Inflation" choice; the caller supplies which
 * perspective the whole combined view should use.
 */
export function usePortfolioProjection(perspective: Ref<'raw' | 'inflation-adjusted'>) {
  const portfolio = usePortfolioStore();
  const assumptions = usePortfolioAssumptionsStore();
  const retirementPlan = useRetirementPlanStore();

  const accounts = computed(() =>
    portfolio.accounts.map((a) => ({ id: a.id, name: a.name, store: useAccountStore(a.id) }))
  );

  const seriesFor = (store: ReturnType<typeof useAccountStore>): AnnualProjection[] =>
    store.futureProjection[perspective.value] ?? [];

  const rows = computed<PortfolioProjectionRow[]>(() => {
    const out: PortfolioProjectionRow[] = [];
    for (const { id, name, store } of accounts.value) {
      seriesFor(store).forEach((row, i) => {
        out.push({
          age: assumptions.ageToday + i,
          accountId: id,
          accountName: name,
          stage: row.stage,
          balance: row.endBalance,
          annualFlow: row.annualFlow,
          totalGrowth: row.totalGrowth,
        });
      });
    }
    return out;
  });

  const stageAggregates = computed<StageAggregate[]>(() => {
    const stageIds = [ACCUMULATION_ID, ...retirementPlan.stages.map((s) => s.id)];

    return stageIds.map((stage) => {
      let finalBalance = 0;
      let totalFlow = 0;
      let totalGrowth = 0;

      for (const { store } of accounts.value) {
        const stageRows = seriesFor(store).filter((r) => r.stage === stage);
        if (stageRows.length === 0) continue;

        // Final balance for this stage = each account's own last row in it,
        // summed — an account that never enters a stage contributes nothing.
        finalBalance += stageRows[stageRows.length - 1]!.endBalance;
        totalFlow += stageRows.reduce((sum, r) => sum + r.annualFlow, 0);
        totalGrowth += stageRows.reduce((sum, r) => sum + r.totalGrowth, 0);
      }

      return { stage, finalBalance, totalFlow, totalGrowth };
    });
  });

  return { rows, stageAggregates };
}
