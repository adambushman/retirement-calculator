import { computed } from 'vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import {
  STAGE_BRIDGE,
  STAGE_GO_GO,
  STAGE_SLOW_GO,
  STAGE_NO_GO,
  type StageName,
} from '@/composeables/useStages';

export interface StageCoverage {
  stage: StageName;
  /**
   * Sum of Withdrawal Share (%) among accounts unlocked by the end of this
   * stage. Accounts don't have to sum to 100 — coverage is purely
   * informational, never enforced or normalized (see the redesign notes:
   * "allow it, show coverage %"). It's also not time-accurate *within* a
   * stage — an account that unlocks partway through still counts as fully
   * eligible for the whole stage, since per-year coverage would vary
   * continuously and isn't worth the complexity for a readout.
   */
  coveragePercent: number;
}

/**
 * Cross-account, portfolio-wide views that no single store can answer on its
 * own — see the "stores stay single-domain, composables handle cross-cutting
 * derived logic" convention (Stage 1 of the multi-account redesign).
 */
export function usePortfolioCoverage() {
  const portfolio = usePortfolioStore();
  const assumptions = usePortfolioAssumptionsStore();

  const accountStores = computed(() => portfolio.accounts.map((a) => useAccountStore(a.id)));

  // The earliest age any account starts withdrawing before Retirement Age —
  // i.e. when the portfolio's shared Bridge window opens. Null if every
  // account waits until Retirement Age (or later) to start, so there's no
  // Bridge stage at all this portfolio.
  const bridgeStartAge = computed<number | null>(() => {
    const earlyStarts = accountStores.value
      .map((s) => s.withdrawalStartAge)
      .filter((age) => age < assumptions.retirementAge);
    return earlyStarts.length > 0 ? Math.min(...earlyStarts) : null;
  });

  // When the last account finally starts withdrawing — i.e. when the portfolio
  // has no money still accumulating anywhere. Usually just Retirement Age, but
  // an account that unlocks later keeps compounding untouched past it, so the
  // Accumulation stage can outlast the working years.
  const accumulationEndAge = computed<number>(() => {
    const starts = accountStores.value.map((s) => s.withdrawalStartAge);
    return starts.length > 0
      ? Math.max(assumptions.retirementAge, ...starts)
      : assumptions.retirementAge;
  });

  const stageCoverage = computed<StageCoverage[]>(() => {
    const shareOfAccountsUnlockedBefore = (endAge: number) =>
      accountStores.value
        .filter((s) => s.withdrawalStartAge < endAge)
        .reduce((sum, s) => sum + s.withdrawalShare, 0);

    const [goGoEndAge, slowGoEndAge] = assumptions.retirementBoundaries;

    return [
      { stage: STAGE_BRIDGE, coveragePercent: shareOfAccountsUnlockedBefore(assumptions.retirementAge) },
      { stage: STAGE_GO_GO, coveragePercent: shareOfAccountsUnlockedBefore(goGoEndAge ?? assumptions.retirementAge) },
      { stage: STAGE_SLOW_GO, coveragePercent: shareOfAccountsUnlockedBefore(slowGoEndAge ?? assumptions.retirementAge) },
      { stage: STAGE_NO_GO, coveragePercent: shareOfAccountsUnlockedBefore(assumptions.lifeExpectancy) },
    ];
  });

  return { bridgeStartAge, accumulationEndAge, stageCoverage };
}
