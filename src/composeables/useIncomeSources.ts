import { naiveAccumulate } from '@/composeables/useNaiveAccountProjection';

// Income sources (Social Security, pensions, annuities) are deliberately NOT
// accounts: they have no balance the user draws down, so they don't take a
// withdrawal share of any stage. Instead each one simply pays out, on its
// own schedule, from its start age until life expectancy — and whatever it
// pays each year is subtracted from that year's stage target before the
// portfolio's accounts split what's left (see useAccountProjection.ts).
//
// Only an annuity has a real balance, and only until it starts paying: it
// accumulates like a small account (starting balance + flat monthly
// contributions + growth) and its first payment is that balance times its
// payout rate. Social Security and pensions are just "a monthly benefit
// starting at an age" — the user already knows the benefit from their
// statement, so there's nothing to accumulate.
//
// Everything here is pure (no stores), like useNaiveAccountProjection.ts.

export type IncomeSourceType = 'social-security' | 'pension' | 'annuity';

export interface IncomeSource {
  id: string;
  type: IncomeSourceType;
  name: string;
  ownerName: string;
  /** Age payments begin. */
  startAge: number;
  /**
   * Monthly benefit in TODAY's dollars, as a benefit statement quotes it
   * (social-security and pension only — an annuity's benefit is derived
   * from its balance instead). Restated at startAge using the inflation
   * assumption; see firstAnnualIncome.
   */
  monthlyBenefit: number;
  /** Annual increase (COLA) applied to payments after they begin, in percent. */
  cola: number;

  // Annuity only — ignored by the other types.
  currentBalance: number;
  monthlyContribution: number;
  growthRate: number;
  /** First-year payout as a percent of the balance at startAge. */
  payoutRate: number;
}

/** The slice of the portfolio assumptions these calculations need. */
export interface IncomeContext {
  ageToday: number;
  lifeExpectancy: number;
  annualInflation: number;
}

/** A source reduced to just what the year-by-year engine needs. */
export interface ResolvedIncomeSource {
  id: string;
  startAge: number;
  /** Nominal dollars per year in the first year of payments. */
  firstAnnualIncome: number;
  cola: number;
}

function yearsUntilStart(source: IncomeSource, ctx: IncomeContext): number {
  return Math.max(0, source.startAge - ctx.ageToday);
}

/** An annuity's balance the moment it starts paying (0 for the other types). */
export function annuityBalanceAtStart(source: IncomeSource, ctx: IncomeContext): number {
  if (source.type !== 'annuity') return 0;
  return naiveAccumulate(
    source.currentBalance,
    source.monthlyContribution,
    source.growthRate,
    yearsUntilStart(source, ctx)
  );
}

/**
 * Nominal dollars per year in the first year of payments. A benefit quoted
 * in today's dollars (social-security, pension) is inflated forward to the
 * start age; an annuity's is its accumulated balance times its payout rate,
 * which is already nominal.
 */
export function firstAnnualIncome(source: IncomeSource, ctx: IncomeContext): number {
  if (source.type === 'annuity') {
    return (annuityBalanceAtStart(source, ctx) * source.payoutRate) / 100;
  }
  const inflationToStart = Math.pow(1 + ctx.annualInflation / 100, yearsUntilStart(source, ctx));
  return source.monthlyBenefit * 12 * inflationToStart;
}

export function resolveIncomeSource(source: IncomeSource, ctx: IncomeContext): ResolvedIncomeSource {
  return {
    id: source.id,
    startAge: source.startAge,
    firstAnnualIncome: firstAnnualIncome(source, ctx),
    cola: source.cola,
  };
}

/**
 * Nominal dollars this source pays in the year starting at `age` (0 before
 * it begins). The year's exponent is whole years since payments began, so a
 * start age of 67.5 pays its base amount in the first whole year at or
 * after it — the same whole-year approximation the account engine uses for
 * withdrawal start ages.
 */
export function incomeAtAge(source: ResolvedIncomeSource, age: number): number {
  if (age < source.startAge) return 0;
  const yearsSinceStart = Math.max(0, Math.floor(age - source.startAge));
  return source.firstAnnualIncome * Math.pow(1 + source.cola / 100, yearsSinceStart);
}

/** Every source's payments combined, in nominal dollars for the year starting at `age`. */
export function totalIncomeAtAge(sources: ResolvedIncomeSource[], age: number): number {
  return sources.reduce((sum, s) => sum + incomeAtAge(s, age), 0);
}

/**
 * Total nominal income this source pays from its start age through the year
 * before life expectancy — its lifetime payout, before any inflation
 * restating. Optionally restated in today's dollars year by year.
 */
export function lifetimeIncome(
  source: IncomeSource,
  ctx: IncomeContext,
  inflationAdjusted: boolean
): number {
  const resolved = resolveIncomeSource(source, ctx);
  let total = 0;
  for (let age = ctx.ageToday; age < ctx.lifeExpectancy; age++) {
    const nominal = incomeAtAge(resolved, age);
    total += inflationAdjusted
      ? nominal / Math.pow(1 + ctx.annualInflation / 100, age - ctx.ageToday)
      : nominal;
  }
  return total;
}
