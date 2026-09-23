export interface AnnualProjection {
  year: number;
  stage: string;
  startBalance: number;
  endBalance: number;
  annualFlow: number;
  /**
   * Early-withdrawal penalty paid this year, as a positive number — money
   * that leaves the account on top of `annualFlow` without replacing any
   * income. Deliberately kept out of `annualFlow` so that anything asking
   * "how much income did this actually replace?" (see useStageFunding.ts)
   * doesn't count penalty dollars as income the account delivered.
   */
  penalty: number;
  totalGrowth: number;
}

/**
 * The year's balance identity, with penalties in it:
 *
 *   endBalance = startBalance + annualFlow - penalty + totalGrowth
 *
 * Anything deriving one of these from the others (rather than summing a
 * field row by row) has to carry the penalty term — see the note in
 * usePortfolioProjection.ts on why growth is derived that way at all.
 */

export interface FullProjection {
  'raw': AnnualProjection[] | null;
  'inflation-adjusted': AnnualProjection[] | null;
}

/**
 * Restates a raw year-by-year projection in today's dollars, dividing every
 * figure by cumulative inflation to that point. Row 0 is "today" (no
 * adjustment), matching the basis the chart uses for its age labels.
 */
export function applyInflationAdjustment(
  rows: AnnualProjection[],
  annualInflation: number
): AnnualProjection[] {
  return rows.map((p, i) => {
    const inflationFactor = Math.pow(1 + annualInflation / 100, i);

    return {
      ...p,
      startBalance: p.startBalance / inflationFactor,
      endBalance: p.endBalance / inflationFactor,
      annualFlow: p.annualFlow / inflationFactor,
      penalty: p.penalty / inflationFactor,
      totalGrowth: p.totalGrowth / inflationFactor,
    };
  });
}

/**
 * The balance a year-by-year projection shows at a given age (before that
 * age, or with no projection yet, the account's own current balance — it
 * hasn't started moving). Shared by an account's own balanceAtWithdrawalStart
 * (using its own inflation perspective) and any portfolio-wide summary that
 * needs the same figure under an externally chosen perspective instead (see
 * PortfolioSummary.vue's own inflation toggle).
 */
export function balanceAtAge(
  rows: AnnualProjection[] | null | undefined,
  ageToday: number,
  targetAge: number,
  currentBalance: number
): number {
  if (!rows || rows.length === 0) return currentBalance;

  const index = targetAge - ageToday;
  if (index <= 0) return currentBalance;
  if (index >= rows.length) return rows[rows.length - 1]!.endBalance;
  return rows[index]!.startBalance;
}
