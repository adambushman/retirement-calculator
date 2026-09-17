// A second, deliberately independent projection for a single account, used
// only by the account card (its subtitle and "Potential" section) — NOT the
// portfolio-wide chart or stage breakdown, which stay on the cross-account
// engine in useAccountProjection.ts/usePortfolioSimulation.ts, pegged to
// Withdrawal Start Age.
//
// That engine's numbers now depend on a field (Withdrawal Start Age) that
// lives several sections below the account card, in the Retirement Plan
// section — so a card reviewed in isolation would be describing an outcome
// the account itself hasn't specified yet. This "naive" projection instead
// answers a self-contained question that needs nothing from later sections:
// "if I start drawing on this account as soon as I'm legally able to
// (Penalty-Free Withdrawal Age for Traditional/Roth, or a chosen age for
// Brokerage, which has no such rule), what would the balance be then?"
//
// A monthly-payout figure used to live here too, but it required assuming a
// growth rate straight through retirement — an assumption invisible to the
// user and easy to mistake for a sober one, so it was dropped in favor of
// just the balance itself.
//
// The figure is closed-form (no year-by-year or month-by-month loop): the
// target age can land on a half-year (59.5), and a plain compound-growth/
// annuity formula handles a fractional number of years natively, whereas a
// whole-year loop would need special-casing for the leftover half year.
// Contribution raises are intentionally ignored (flat monthly contribution
// throughout) — this is meant to be a quick, rough read, not a rerun of the
// full simulation.

/**
 * Compounds a starting balance plus a flat monthly contribution forward by
 * `years` (may be fractional, e.g. a target age of 59.5 for someone 31 today
 * gives years = 28.5), at `annualGrowthRatePercent`.
 */
export function naiveAccumulate(
  startingBalance: number,
  monthlyContribution: number,
  annualGrowthRatePercent: number,
  years: number
): number {
  const clampedYears = Math.max(0, years);
  const rate = annualGrowthRatePercent / 100;
  const annualContribution = monthlyContribution * 12;

  const growthFactor = Math.pow(1 + rate, clampedYears);
  const balanceGrowth = startingBalance * growthFactor;

  // Future value of an ordinary annuity of `annualContribution`, compounded
  // at the same annual rate over the same (possibly fractional) span.
  const contributionGrowth =
    rate === 0 ? annualContribution * clampedYears : annualContribution * ((growthFactor - 1) / rate);

  return balanceGrowth + contributionGrowth;
}
