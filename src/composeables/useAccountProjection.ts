import type { AnnualProjection, FullProjection } from '@/composeables/useProjections';
import { applyInflationAdjustment } from '@/composeables/useProjections';
import {
  STAGE_ACCUMULATION,
  STAGE_BRIDGE,
  STAGE_GO_GO,
  STAGE_SLOW_GO,
  STAGE_NO_GO,
  type StageName,
} from '@/composeables/useStages';

// The shared, cross-account timeline engine (see the project's redesign
// notes): rather than each account running its own independent sequence of
// stages, every account is walked year-by-year against the *same* portfolio
// ages (Retirement Age, the Go/Slow/No-Go boundaries) and classified into
// whichever of five states applies that year:
//
//   - Accumulation   — before this account's own withdrawal start age. The
//     account is untouched and compounds at its growth-phase rate. Whether
//     the portfolio has retired yet only decides whether *contributions* are
//     still arriving (see contributingCutoffAge); it does not end this stage.
//   - Bridge         — this account has started withdrawing early (its own
//     start age is before Retirement Age), so it partially replaces income
//     while other accounts/income may still be active.
//   - Go-Go/Slow-Go/No-Go — this account is actively withdrawing.
//
// The two ages are deliberately independent, because they answer different
// questions:
//
//   Retirement Age (portfolio-wide) — when the paycheck stops. It ends
//     contributions everywhere and starts the Go-Go/Slow-Go/No-Go clock that
//     sets the income-replacement target.
//   Withdrawal Start Age (per account) — when *this* account starts being
//     drawn down. It is the sole boundary between the account's growth-phase
//     and drawdown-phase rates, and the sole trigger for its withdrawals.
//
// So an account can be fully retired-era and still accumulating: no more
// contributions arriving, but nothing coming out and no reason to de-risk
// yet either.
//
// `withdrawalShare` is applied against the portfolio's shared
// income-replacement target for whichever stage an account is withdrawing
// in, but each account's own stage boundaries are evaluated using *its own*
// withdrawal start age rather than a portfolio-wide one.
export type ContributionMode = 'percent' | 'dollar';

export interface AccountProjectionInput {
  currentBalance: number;
  growthRatePreRetirement: number;
  growthRateIntraRetirement: number;
  contributionMode: ContributionMode;
  firstMonthlyContribution: number;
  withdrawalStartAge: number;
  withdrawalShare: number; // 0-100
}

export interface PortfolioProjectionAssumptions {
  ageToday: number;
  lifeExpectancy: number;
  retirementAge: number;
  annualIncome: number;
  annualRaises: number;
  retirementBoundaries: number[]; // [goGoEndAge, slowGoEndAge]
  incomeReplacementBridge: number;
  incomeReplacementGoGo: number;
  incomeReplacementSlowGo: number;
  incomeReplacementNoGo: number;
  annualInflation: number;
}

/** Which of Go-Go/Slow-Go/No-Go a given age falls into (never Bridge/Pre-Retirement). */
function withdrawalStageForAge(age: number, boundaries: number[]): StageName {
  const [goGoEndAge, slowGoEndAge] = boundaries;
  if (goGoEndAge !== undefined && age < goGoEndAge) return STAGE_GO_GO;
  if (slowGoEndAge !== undefined && age < slowGoEndAge) return STAGE_SLOW_GO;
  return STAGE_NO_GO;
}

function replacementRateFor(stage: StageName, assumptions: PortfolioProjectionAssumptions): number {
  switch (stage) {
    case STAGE_BRIDGE: return assumptions.incomeReplacementBridge;
    case STAGE_GO_GO: return assumptions.incomeReplacementGoGo;
    case STAGE_SLOW_GO: return assumptions.incomeReplacementSlowGo;
    default: return assumptions.incomeReplacementNoGo;
  }
}

interface AccountState {
  id: string;
  input: AccountProjectionInput;
  balance: number;
  contributionMonthly: number;
  contributingCutoffAge: number;
  rows: AnnualProjection[];
}

/**
 * Runs every account's year-by-year timeline together, in lockstep, so that
 * a depleted account's share of a stage's target income-replacement dollar
 * amount can be picked up by its still-solvent siblings instead of simply
 * going unmet (e.g. a 50/50 split between two accounts becomes 100% from the
 * survivor once the other hits zero). Each account's own contributing/
 * dormant/Bridge/withdrawing phase is still driven purely by its own ages;
 * only the withdrawal amount *within* the withdrawing phase is redistributed,
 * and only among accounts that are already unlocked this year — an account
 * that hasn't reached its own withdrawal start age yet is untouched by this
 * (see usePortfolioCoverage's coverage %, which surfaces that separate gap).
 */
export function computePortfolioSimulation(
  accounts: (AccountProjectionInput & { id: string })[],
  assumptions: PortfolioProjectionAssumptions
): Map<string, FullProjection> {
  const yearsUntilRetirement = assumptions.retirementAge - assumptions.ageToday;
  // Income in the portfolio's final working year: compound the annual raise
  // once per completed working year (year 1 is worked at today's salary, no
  // raise yet, matching the compounding below), so the exponent is one less
  // than the number of years until retirement.
  const annualIncomeAtRetirement =
    assumptions.annualIncome * Math.pow(1 + assumptions.annualRaises / 100, Math.max(0, yearsUntilRetirement - 1));
  const monthlyIncomeAtRetirement = annualIncomeAtRetirement / 12;

  const totalYears = assumptions.lifeExpectancy - assumptions.ageToday;

  const state: AccountState[] = accounts.map((input) => ({
    id: input.id,
    input,
    balance: input.currentBalance,
    contributionMonthly: input.firstMonthlyContribution,
    // This account stops contributing at whichever comes first: its own
    // withdrawal start age, or the portfolio-wide Retirement Age.
    contributingCutoffAge: Math.min(input.withdrawalStartAge, assumptions.retirementAge),
    rows: [],
  }));

  for (let i = 0; i < totalYears; i++) {
    const age = assumptions.ageToday + i;

    // Classify each account's phase this year from its own ages only.
    const stageById = new Map<string, StageName>();
    const withdrawing: AccountState[] = [];

    for (const s of state) {
      if (age < s.input.withdrawalStartAge) {
        // Still accumulating — whether or not the portfolio has retired.
        stageById.set(s.id, STAGE_ACCUMULATION);
      } else {
        stageById.set(s.id, age < assumptions.retirementAge
          ? STAGE_BRIDGE
          : withdrawalStageForAge(age, assumptions.retirementBoundaries));
        withdrawing.push(s);
      }
    }

    // Every currently-withdrawing account shares the same stage this year —
    // Bridge only applies before Retirement Age (when no post-retirement
    // stage is possible yet), and after Retirement Age the stage is
    // boundary-based on age alone — so one target/rate applies to the whole
    // pool of already-unlocked accounts.
    let targetAnnualFull = 0;
    let originalPoolShareSum = 0;
    let activeShareSum = 0;
    if (withdrawing.length > 0) {
      const stage = stageById.get(withdrawing[0]!.id)!;
      const rate = replacementRateFor(stage, assumptions);
      targetAnnualFull = monthlyIncomeAtRetirement * (rate / 100) * 12;
      for (const s of withdrawing) {
        originalPoolShareSum += s.input.withdrawalShare;
        if (s.balance > 0) activeShareSum += s.input.withdrawalShare;
      }
    }

    for (const s of state) {
      const stage = stageById.get(s.id)!;
      const startBalance = s.balance;
      let annualFlow = 0;
      let growthRate: number;

      if (age < s.input.withdrawalStartAge) {
        // Contributions stop when the paycheck does, but the account stays in
        // its growth-phase allocation until it's actually drawn from — so a
        // retired-but-not-yet-unlocked account keeps compounding at the
        // growth-phase rate with zero flow.
        annualFlow = age < s.contributingCutoffAge ? s.contributionMonthly * 12 : 0;
        growthRate = s.input.growthRatePreRetirement;
      } else {
        growthRate = s.input.growthRateIntraRetirement;
        // Redistribute this stage's target across whichever already-unlocked
        // accounts are still solvent, weighted by their own share — a
        // depleted account (or one with no remaining active peers) simply
        // contributes zero.
        if (s.balance > 0 && activeShareSum > 0) {
          const effectiveShare = (s.input.withdrawalShare / activeShareSum) * (originalPoolShareSum / 100);
          annualFlow = -(targetAnnualFull * effectiveShare);
          // Clamp a withdrawal that would overdraw the account: it can only
          // take what's left, ending the year at exactly zero.
          if (s.balance + annualFlow < 0) annualFlow = -s.balance;
        }
      }

      s.balance += annualFlow;
      s.balance *= 1 + growthRate / 100;
      if (s.balance < 0) s.balance = 0;
      const endBalance = s.balance;

      s.rows.push({
        year: i + 1,
        stage,
        startBalance,
        endBalance,
        annualFlow,
        totalGrowth: endBalance - startBalance - annualFlow,
      });

      // Contributions grow with raises (percent-of-income mode only) each
      // year they're still being made; a flat-dollar contribution is fixed.
      if (age < s.contributingCutoffAge && s.input.contributionMode === 'percent') {
        s.contributionMonthly *= 1 + assumptions.annualRaises / 100;
      }
    }
  }

  const result = new Map<string, FullProjection>();
  for (const s of state) {
    result.set(s.id, {
      raw: s.rows,
      'inflation-adjusted': applyInflationAdjustment(s.rows, assumptions.annualInflation),
    });
  }
  return result;
}
