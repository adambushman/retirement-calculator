import type { AnnualProjection, FullProjection } from '@/composeables/useProjections';
import { applyInflationAdjustment } from '@/composeables/useProjections';
import { ACCUMULATION_ID, stageForAge, type Stage } from '@/composeables/useStages';

// The shared, cross-account timeline engine: rather than each account
// running its own independent sequence of stages, every account is walked
// year-by-year against the same portfolio ages and classified into one of
// two states each year:
//
//   - Accumulation — before this account's own withdrawal start age. The
//     account is untouched and compounds at its growth-phase rate.
//   - One of the user's own Stages — this account has started withdrawing
//     (its own start age has passed), so it draws against whichever stage
//     covers the current age, per that stage's own income-replacement rate
//     and its own withdrawalShareByAccount.
//
// withdrawalStartAge isn't an independent input here either — the caller
// (usePortfolioSimulation.ts) sources it from useAccountStore's
// effectiveWithdrawalStartAge, itself derived from the plan (the start age
// of the earliest stage where this account's own withdrawalShareByAccount is
// above 0%, or Infinity if none). An account can never actually withdraw
// before a stage exists to draw against — see the `unlocked` check below,
// which gates on both this age AND a real current stage — so there's no
// unstaged fallback to handle in this engine.
export type ContributionMode = 'percent' | 'dollar';

export interface AccountProjectionInput {
  currentBalance: number;
  growthRatePreRetirement: number;
  growthRateIntraRetirement: number;
  contributionMode: ContributionMode;
  firstMonthlyContribution: number;
  // The raise rate this account's percent-of-income contribution escalates
  // by each year — the specific income stream it's tied to, or the
  // household's blended rate when it isn't tied to one. Ignored in dollar
  // mode. See useAccountStore's contributionRaises.
  contributionRaises: number;
  // Infinity means this account never withdraws (see the module comment).
  withdrawalStartAge: number;
}

export interface PortfolioProjectionAssumptions {
  ageToday: number;
  lifeExpectancy: number;
  // The retirementAge replacement — stages[0].startAge, or lifeExpectancy
  // when the user has no stages at all (so nothing is ever "withdrawing").
  firstStageStartAge: number;
  annualIncome: number;
  annualRaises: number;
  stages: Stage[];
  annualInflation: number;
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
 * dormant/withdrawing phase is still driven purely by its own ages; only the
 * withdrawal amount *within* the withdrawing phase is redistributed, and
 * only among accounts that are already unlocked this year — an account that
 * hasn't reached its own withdrawal start age yet is untouched by this (see
 * usePortfolioCoverage's coverage %, which surfaces that separate gap).
 */
export function computePortfolioSimulation(
  accounts: (AccountProjectionInput & { id: string })[],
  assumptions: PortfolioProjectionAssumptions
): Map<string, FullProjection> {
  const yearsUntilFirstStage = assumptions.firstStageStartAge - assumptions.ageToday;
  // Income in the last accumulation year: compound the annual raise once per
  // completed working year (year 1 is worked at today's salary, no raise
  // yet, matching the compounding below), so the exponent is one less than
  // the number of years until the first stage begins.
  const annualIncomeAtFirstStage =
    assumptions.annualIncome * Math.pow(1 + assumptions.annualRaises / 100, Math.max(0, yearsUntilFirstStage - 1));
  const monthlyIncomeAtFirstStage = annualIncomeAtFirstStage / 12;

  const totalYears = assumptions.lifeExpectancy - assumptions.ageToday;

  const state: AccountState[] = accounts.map((input) => ({
    id: input.id,
    input,
    balance: input.currentBalance,
    contributionMonthly: input.firstMonthlyContribution,
    // This account stops contributing exactly when withdrawals begin from
    // it — its own effective withdrawal start age, full stop. Not tied to
    // the portfolio's first stage start: an account that isn't drawn on
    // until a later stage keeps contributing right up until that stage
    // actually reaches it, even past when other accounts have already
    // started withdrawing.
    contributingCutoffAge: input.withdrawalStartAge,
    rows: [],
  }));

  for (let i = 0; i < totalYears; i++) {
    const age = assumptions.ageToday + i;

    // Every currently-withdrawing account is, by construction, in the same
    // stage this year (stage classification is purely age-based) — computed
    // once and reused both for classification and for the pooled target
    // below. An account only actually starts withdrawing once BOTH its own
    // withdrawalStartAge has passed AND a real stage exists to withdraw
    // against — a withdrawalStartAge earlier than any stage (or a zero-stage
    // plan entirely) just leaves it dormant rather than opening an unstaged
    // withdrawal window, so there's nothing to clamp on the input side.
    const currentStage = stageForAge(assumptions.stages, age);
    const currentStageId = currentStage?.id ?? ACCUMULATION_ID;

    const withdrawing = currentStage ? state.filter((s) => age >= s.input.withdrawalStartAge) : [];

    let targetAnnualFull = 0;
    let originalPoolShareSum = 0;
    let activeShareSum = 0;
    if (withdrawing.length > 0) {
      const rate = currentStage?.incomeReplacementRate ?? 0;
      targetAnnualFull = monthlyIncomeAtFirstStage * (rate / 100) * 12;
      for (const s of withdrawing) {
        const share = currentStage?.withdrawalShareByAccount[s.id] ?? 0;
        originalPoolShareSum += share;
        if (s.balance > 0) activeShareSum += share;
      }
    }

    for (const s of state) {
      const unlocked = currentStage !== null && age >= s.input.withdrawalStartAge;
      const stage = unlocked ? currentStageId : ACCUMULATION_ID;
      const startBalance = s.balance;
      let annualFlow = 0;
      let growthRate: number;

      if (!unlocked) {
        // Contributions stop when the paycheck does, but the account stays in
        // its growth-phase allocation until it's actually drawn from — so a
        // retired-but-not-yet-unlocked account keeps compounding at the
        // growth-phase rate with zero flow.
        annualFlow = age < s.contributingCutoffAge ? s.contributionMonthly * 12 : 0;
        growthRate = s.input.growthRatePreRetirement;
      } else {
        growthRate = s.input.growthRateIntraRetirement;
        // Redistribute this stage's target across whichever already-unlocked
        // accounts are still solvent, weighted by their own share of *this
        // stage* — a depleted account (or one with no remaining active
        // peers) simply contributes zero.
        const share = currentStage?.withdrawalShareByAccount[s.id] ?? 0;
        if (s.balance > 0 && activeShareSum > 0) {
          const effectiveShare = (share / activeShareSum) * (originalPoolShareSum / 100);
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
      // Each account escalates at its own contributionRaises — the specific
      // income stream it's tied to, or the household blend otherwise — not
      // a single portfolio-wide rate.
      if (age < s.contributingCutoffAge && s.input.contributionMode === 'percent') {
        s.contributionMonthly *= 1 + s.input.contributionRaises / 100;
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
