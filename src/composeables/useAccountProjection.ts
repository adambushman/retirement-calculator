import type { AnnualProjection, FullProjection } from '@/composeables/useProjections';
import { applyInflationAdjustment } from '@/composeables/useProjections';
import { ACCUMULATION_ID, stageForAge, type Stage } from '@/composeables/useStages';
import { totalIncomeAtAge, type ResolvedIncomeSource } from '@/composeables/useIncomeSources';

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
//
// Income sources (Social Security, pensions, annuities — see
// useIncomeSources.ts) aren't accounts and never withdraw from anything:
// each simply pays out from its own start age, in every stage, and what it
// pays that year is subtracted from the stage's target before the
// withdrawing accounts split the remainder. Income before the first stage
// begins has no target to offset, so it only counts from that stage's start.
export type ContributionMode = 'percent' | 'dollar';

export interface AccountProjectionInput {
  currentBalance: number;
  growthRatePreRetirement: number;
  contributionMode: ContributionMode;
  firstMonthlyContribution: number;
  // The raise rate this account's percent-of-income contribution escalates
  // by each year — the specific income stream it's tied to, or the
  // household's blended rate when it isn't tied to one. Ignored in dollar
  // mode. See useAccountStore's contributionRaises.
  contributionRaises: number;
  // Infinity means this account never withdraws (see the module comment).
  withdrawalStartAge: number;
  // The account type's own early-withdrawal rules (see useAccountTypes.ts),
  // passed in as plain numbers rather than looked up here so this engine
  // stays a pure function of its inputs. `null` on either means this account
  // is never penalized — a Brokerage account has no penalty age at all.
  penaltyFreeWithdrawalAge: number | null;
  earlyWithdrawalPenaltyRate: number | null;
}

/**
 * The penalty rate (as a fraction, e.g. 0.1) this account pays on a
 * withdrawal taken at `age`, or 0 when it's past its penalty-free age.
 *
 * The penalty-free age is a half-year (59½) but the whole engine walks in
 * whole years, so an age is either penalized or it isn't: age 59 is
 * penalized in full, age 60 isn't penalized at all. Slightly conservative
 * across the crossover year, and simple enough to state plainly in the UI.
 */
export function penaltyRateAtAge(input: AccountProjectionInput, age: number): number {
  const { penaltyFreeWithdrawalAge, earlyWithdrawalPenaltyRate } = input;
  if (penaltyFreeWithdrawalAge === null || earlyWithdrawalPenaltyRate === null) return 0;
  return age < penaltyFreeWithdrawalAge ? earlyWithdrawalPenaltyRate / 100 : 0;
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
  incomeSources: ResolvedIncomeSource[];
  // One rate for every account once it's being withdrawn from — see
  // useRetirementPlanStore's own comment on why this isn't per-account.
  growthRateIntraRetirement: number;
}

/**
 * The household's career income restated for the year starting at `age`:
 * what it had grown to by the last working year, then indexed by inflation
 * for every year since the first stage began — retirement spending is meant
 * to hold its purchasing power, so a figure that stayed flat in nominal
 * dollars would quietly shrink in real terms (and fall behind any income
 * source with a COLA).
 */
function careerIncomeAtAge(assumptions: PortfolioProjectionAssumptions, age: number): number {
  const yearsUntilFirstStage = assumptions.firstStageStartAge - assumptions.ageToday;
  // Income in the last accumulation year: compound the annual raise once per
  // completed working year (year 1 is worked at today's salary, no raise
  // yet), so the exponent is one less than the number of years until the
  // first stage begins.
  const annualIncomeAtFirstStage =
    assumptions.annualIncome * Math.pow(1 + assumptions.annualRaises / 100, Math.max(0, yearsUntilFirstStage - 1));

  const yearsIntoRetirement = Math.max(0, age - assumptions.firstStageStartAge);
  return annualIncomeAtFirstStage * Math.pow(1 + assumptions.annualInflation / 100, yearsIntoRetirement);
}

/**
 * The nominal dollars a stage needs its ACCOUNTS to replace in the year
 * starting at `age`:
 *
 *   (career income × rate) − guaranteed income
 *
 * The rate is taken against the whole career income, and the guaranteed
 * income sources then count toward that target — so the rate keeps meaning
 * "the share of my working income I want to live on", and the accounts fund
 * whatever Social Security, a pension or an annuity doesn't. Applying the
 * rate to the income NET of those sources instead would quietly break that
 * reading: at a 80% rate against a $30k floor, the household would end up
 * living on 86% of its career income rather than the 80% it asked for.
 *
 * Guaranteed income is netted out HERE rather than by each caller, so the
 * simulation and useStageFunding.ts can't drift apart on what a stage is
 * actually asking its accounts for.
 */
export function accountsTargetAnnual(
  assumptions: PortfolioProjectionAssumptions,
  stage: Stage,
  age: number
): number {
  const target = careerIncomeAtAge(assumptions, age) * (stage.incomeReplacementRate / 100);

  // Never below zero: guaranteed income beyond what the stage targets simply
  // leaves the accounts nothing to replace, rather than becoming a negative
  // need (the surplus goes unspent).
  return Math.max(0, target - totalIncomeAtAge(assumptions.incomeSources, age));
}

interface AccountState {
  id: string;
  input: AccountProjectionInput;
  balance: number;
  contributionMonthly: number;
  contributingCutoffAge: number;
  rows: AnnualProjection[];
}

// Floating-point slack, in dollars: a remaining target (or a remaining
// balance) smaller than this is treated as fully drawn rather than kept in
// the allocation loop below.
const ALLOCATION_EPSILON = 1e-6;

/**
 * Splits one year of a stage's target across the accounts drawing on it,
 * returning how much spendable income each one delivers (penalties are on
 * top of this — see penaltyRateAtAge).
 *
 * Every account is first asked for its own share, but an account whose
 * balance runs out partway through the year can only cover part of it — and
 * the rest is then picked up by whichever siblings still have money, in the
 * SAME year, re-weighted by their own shares. Handing the remainder on
 * immediately is what keeps the year an account finally runs dry from
 * showing a phantom gap: weighting purely by start-of-year balances leaves
 * the drained account's unmet portion uncovered until the following year (by
 * which point its balance reads as zero up front), even where its siblings
 * are sitting on plenty. Only a target that outruns *every* drawing
 * account's balance is left unmet — which is precisely the case
 * useStageFunding.ts reports on.
 */
function allocateWithdrawals(
  withdrawing: AccountState[],
  stage: Stage,
  targetAnnualFull: number,
  age: number
): Map<string, number> {
  const draws = new Map<string, number>();

  let poolShareSum = 0;
  for (const s of withdrawing) poolShareSum += stage.withdrawalShareByAccount[s.id] ?? 0;
  if (poolShareSum <= 0) return draws;

  // These accounts only ever cover their own collective share of the target;
  // whatever belongs to an account that isn't drawing yet simply goes unmet.
  let remaining = targetAnnualFull * (poolShareSum / 100);
  let eligible = withdrawing.filter(
    (s) => (stage.withdrawalShareByAccount[s.id] ?? 0) > 0 && s.balance > 0
  );

  // Each pass either meets the target outright or drains at least one more
  // account (dropping it from `eligible`), so this settles in at most one
  // pass per account.
  while (remaining > ALLOCATION_EPSILON && eligible.length > 0) {
    let weightSum = 0;
    for (const s of eligible) weightSum += stage.withdrawalShareByAccount[s.id] ?? 0;
    if (weightSum <= 0) break;

    const stillHasRoom: AccountState[] = [];
    let drawnThisPass = 0;

    for (const s of eligible) {
      const share = stage.withdrawalShareByAccount[s.id] ?? 0;
      const alreadyDrawn = draws.get(s.id) ?? 0;
      // A penalized account can only hand over what's left after the
      // penalty it owes on that same money, so $100 of balance at a 10%
      // penalty delivers ~$90.91 of income, not $100. Anything it can't
      // cover spills to its siblings like any other depletion would.
      const capacity = s.balance / (1 + penaltyRateAtAge(s.input, age)) - alreadyDrawn;
      const take = Math.min(remaining * (share / weightSum), capacity);

      draws.set(s.id, alreadyDrawn + take);
      drawnThisPass += take;
      if (take < capacity - ALLOCATION_EPSILON) stillHasRoom.push(s);
    }

    remaining -= drawnThisPass;
    if (drawnThisPass <= ALLOCATION_EPSILON) break;
    eligible = stillHasRoom;
  }

  return draws;
}

/**
 * Runs every account's year-by-year timeline together, in lockstep, so that
 * a depleted account's share of a stage's target income-replacement dollar
 * amount can be picked up by its still-solvent siblings instead of simply
 * going unmet (e.g. a 50/50 split between two accounts becomes 100% from the
 * survivor once the other hits zero — including in the very year it empties,
 * see allocateWithdrawals). Each account's own contributing/dormant/
 * withdrawing phase is still driven purely by its own ages; only the
 * withdrawal amount *within* the withdrawing phase is redistributed, and
 * only among accounts that are already unlocked this year — an account that
 * hasn't reached its own withdrawal start age yet is untouched by this. See
 * useStageFunding.ts for whether a stage's target is actually being met in
 * full once every toggled-on account's own balance is taken into account.
 */
export function computePortfolioSimulation(
  accounts: (AccountProjectionInput & { id: string })[],
  assumptions: PortfolioProjectionAssumptions
): Map<string, FullProjection> {
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

    // What each withdrawing account actually draws this year, already
    // accounting for any sibling that can't cover its own share in full.
    // The target already nets out the guaranteed income sources — see
    // accountsTargetAnnual.
    const draws =
      withdrawing.length > 0 && currentStage
        ? allocateWithdrawals(
            withdrawing,
            currentStage,
            accountsTargetAnnual(assumptions, currentStage, age),
            age
          )
        : new Map<string, number>();

    for (const s of state) {
      const unlocked = currentStage !== null && age >= s.input.withdrawalStartAge;
      const stage = unlocked ? currentStageId : ACCUMULATION_ID;
      const startBalance = s.balance;
      let annualFlow = 0;
      let penalty = 0;
      let growthRate: number;

      if (!unlocked) {
        // Contributions stop when the paycheck does, but the account stays in
        // its growth-phase allocation until it's actually drawn from — so a
        // retired-but-not-yet-unlocked account keeps compounding at the
        // growth-phase rate with zero flow.
        annualFlow = age < s.contributingCutoffAge ? s.contributionMonthly * 12 : 0;
        growthRate = s.input.growthRatePreRetirement;
      } else {
        growthRate = assumptions.growthRateIntraRetirement;
        // Already weighted by this stage's shares and clamped to what each
        // account actually has left, so a depleted account (or one with no
        // remaining solvent peers) simply draws nothing.
        const drawn = draws.get(s.id) ?? 0;
        annualFlow = -drawn;
        // Charged on top of the withdrawal rather than taken out of it: the
        // stage still replaces the income it set out to, and the penalty is
        // what that costs the balance for taking it early.
        penalty = drawn * penaltyRateAtAge(s.input, age);
      }

      s.balance += annualFlow;
      s.balance -= penalty;
      s.balance *= 1 + growthRate / 100;
      if (s.balance < 0) s.balance = 0;
      const endBalance = s.balance;

      s.rows.push({
        year: i + 1,
        stage,
        startBalance,
        endBalance,
        annualFlow,
        penalty,
        totalGrowth: endBalance - startBalance - annualFlow + penalty,
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
