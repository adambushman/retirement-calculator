import type { AnnualProjection, FullProjection } from '@/composeables/useProjections';
import { applyInflationAdjustment } from '@/composeables/useProjections';
import {
  STAGE_PRE_RETIREMENT,
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
//   - contributing   (Pre-Retirement) — before this account's own start age
//     and before the portfolio's Retirement Age, whichever comes first.
//   - Bridge         — this account has started withdrawing early (its own
//     start age is before Retirement Age), so it partially replaces income
//     while other accounts/income may still be active.
//   - dormant        — Retirement Age has passed (no one is earning/
//     contributing anymore) but this account's own start age hasn't arrived
//     yet, so it just grows untouched. Labeled with whichever of
//     Go-Go/Slow-Go/No-Go its age falls in, at zero flow, so it still shows
//     up under the right stage in totals/summaries.
//   - Go-Go/Slow-Go/No-Go — this account is actively withdrawing.
//
// Stage 3 note: `withdrawalShare` is applied directly against the portfolio's
// shared income-replacement target, but Bridge/dormant boundaries are still
// evaluated using *this account's own* withdrawal start age rather than the
// portfolio-wide earliest one — true cross-account coordination (so an
// account isn't dormant if a sibling has already triggered the portfolio
// into its withdrawal phase) is a later stage.
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

export function computeAccountProjection(
  account: AccountProjectionInput,
  assumptions: PortfolioProjectionAssumptions
): FullProjection {
  const yearsUntilRetirement = assumptions.retirementAge - assumptions.ageToday;
  // Income in the portfolio's final working year: compound the annual raise
  // once per completed working year (year 1 is worked at today's salary, no
  // raise yet, matching the compounding below), so the exponent is one less
  // than the number of years until retirement.
  const annualIncomeAtRetirement =
    assumptions.annualIncome * Math.pow(1 + assumptions.annualRaises / 100, Math.max(0, yearsUntilRetirement - 1));
  const monthlyIncomeAtRetirement = annualIncomeAtRetirement / 12;

  const totalYears = assumptions.lifeExpectancy - assumptions.ageToday;
  // This account stops contributing at whichever comes first: its own
  // withdrawal start age, or the portfolio-wide Retirement Age.
  const contributingCutoffAge = Math.min(account.withdrawalStartAge, assumptions.retirementAge);

  const raw: AnnualProjection[] = [];
  let balance = account.currentBalance;
  let contributionMonthly = account.firstMonthlyContribution;

  for (let i = 0; i < totalYears; i++) {
    const age = assumptions.ageToday + i;
    const startBalance = balance;

    let stage: StageName;
    let monthlyFlow: number;
    let growthRate: number;

    if (age < contributingCutoffAge) {
      stage = STAGE_PRE_RETIREMENT;
      monthlyFlow = contributionMonthly;
      growthRate = account.growthRatePreRetirement;
    } else if (age < account.withdrawalStartAge) {
      // Dormant: the portfolio has retired, but this account isn't unlocked
      // yet — no flow, but still labeled by whatever stage its age falls in.
      stage = withdrawalStageForAge(age, assumptions.retirementBoundaries);
      monthlyFlow = 0;
      growthRate = account.growthRateIntraRetirement;
    } else {
      stage = age < assumptions.retirementAge
        ? STAGE_BRIDGE
        : withdrawalStageForAge(age, assumptions.retirementBoundaries);
      const rate = replacementRateFor(stage, assumptions);
      monthlyFlow = -(monthlyIncomeAtRetirement * (rate / 100) * (account.withdrawalShare / 100));
      growthRate = account.growthRateIntraRetirement;
    }

    const annualFlow = monthlyFlow * 12;
    balance += annualFlow;
    balance *= 1 + growthRate / 100;
    const endBalance = balance;

    raw.push({
      year: i + 1,
      stage,
      startBalance,
      endBalance,
      annualFlow,
      totalGrowth: endBalance - startBalance - annualFlow,
    });

    // Contributions grow with raises (percent-of-income mode only) each year
    // they're still being made; a flat-dollar contribution stays fixed.
    if (age < contributingCutoffAge && account.contributionMode === 'percent') {
      contributionMonthly *= 1 + assumptions.annualRaises / 100;
    }
  }

  return {
    raw,
    'inflation-adjusted': applyInflationAdjustment(raw, assumptions.annualInflation),
  };
}
