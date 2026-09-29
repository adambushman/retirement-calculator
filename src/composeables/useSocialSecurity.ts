// Social Security's own claiming-age math — kept separate from
// useIncomeSources.ts because it's a self-contained rule (the SSA's, not
// this app's) worth being able to point at and verify on its own, the same
// way useWithdrawalShares.ts isolates the share-splitting invariant.

/**
 * The age at which Social Security pays a worker's Primary Insurance Amount
 * (PIA) in full — neither reduced for early claiming nor increased for
 * delayed claiming. 67 for everyone born 1960 or later, which covers
 * everyone this calculator's retirement-planning horizon reaches; an
 * earlier birth year has a lower FRA (as low as 65), which would shift
 * every entry in CLAIMING_AGE_TABLE below.
 */
export const FULL_RETIREMENT_AGE = 67;

/**
 * The SSA's own percent-of-PIA table for a 67 FRA, reproduced here as a
 * checkable reference — claimingFactorAt(age) must agree with every row
 * here for a whole-year age (see its own tests/comment). Kept mainly for
 * display: showing the shape of the curve is more useful to someone
 * choosing a claiming age than the formula that generates it.
 */
export const CLAIMING_AGE_TABLE: ReadonlyArray<{ age: number; percentOfPia: number }> = [
  { age: 62, percentOfPia: 70 },
  { age: 63, percentOfPia: 75 },
  { age: 64, percentOfPia: 80 },
  { age: 65, percentOfPia: 86.7 },
  { age: 66, percentOfPia: 93.3 },
  { age: FULL_RETIREMENT_AGE, percentOfPia: 100 },
  { age: 68, percentOfPia: 108 },
  { age: 69, percentOfPia: 116 },
  { age: 70, percentOfPia: 124 },
];

/** The earliest and latest ages Social Security can be claimed at all. */
export const CLAIMING_AGE_MIN = 62;
export const CLAIMING_AGE_MAX = 70;

/**
 * The percent of a worker's PIA that Social Security actually pays for
 * claiming at `age` instead of at Full Retirement Age — the SSA's own
 * reduction/credit rules:
 *
 *  - Before FRA: reduced 5/9 of 1% for each of the first 36 months claimed
 *    early, then 5/12 of 1% for each additional month.
 *  - At or after FRA, up to age 70: increased by a delayed retirement
 *    credit of 2/3 of 1% (8%/year) for each month claimed late.
 *
 * Computed month by month rather than read off CLAIMING_AGE_TABLE so a
 * fractional claiming age (the form allows half-year steps) lands between
 * two whole-year rows correctly instead of snapping to one; every whole
 * year still reproduces that table exactly. Ages outside [62, 70] are
 * clamped — the SSA rules don't extend past either end, and the form
 * itself never offers a start age outside this range for this type.
 */
export function claimingFactorAt(age: number): number {
  const clamped = Math.min(Math.max(age, CLAIMING_AGE_MIN), CLAIMING_AGE_MAX);
  const monthsFromFRA = Math.round((clamped - FULL_RETIREMENT_AGE) * 12);

  if (monthsFromFRA < 0) {
    const monthsEarly = -monthsFromFRA;
    const reduction = Math.min(monthsEarly, 36) * (5 / 9) + Math.max(0, monthsEarly - 36) * (5 / 12);
    return 100 - reduction;
  }

  return 100 + monthsFromFRA * (2 / 3);
}
