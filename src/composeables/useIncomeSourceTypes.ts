import type { Component } from 'vue';

import type { IncomeSource, IncomeSourceType } from '@/composeables/useIncomeSources';
import SocialSecurityIcon from '@/components/icons/SocialSecurityIcon.vue';
import PensionIcon from '@/components/icons/PensionIcon.vue';
import AnnuityIcon from '@/components/icons/AnnuityIcon.vue';

// Mirrors useAccountTypes.ts for the three income-source types: shared
// display order, labels, icons, and descriptive rules. Kept separate since
// an income source is not an AccountType (see useIncomeSources.ts).

export const INCOME_SOURCE_TYPE_ORDER: IncomeSourceType[] = ['social-security', 'pension', 'annuity'];

export const INCOME_SOURCE_TYPE_LABELS: Record<IncomeSourceType, string> = {
  'social-security': 'Social Security',
  pension: 'Pension',
  annuity: 'Annuity',
};

export const INCOME_SOURCE_TYPE_ICONS: Record<IncomeSourceType, Component> = {
  'social-security': SocialSecurityIcon,
  pension: PensionIcon,
  annuity: AnnuityIcon,
};

export interface IncomeSourceTypeRules {
  /** Descriptive only — not used in calculations. */
  taxDescription: string;
  paymentTaxTreatment: string;
  /** Descriptive only: how long payments last. Every source is modeled as lifelong. */
  paymentDuration: string;
  /** The youngest/oldest start age the form offers; null means only "your age today" / life expectancy bound it. */
  startAgeMin: number | null;
  startAgeMax: number | null;
  /** Whether this type carries a balance that accumulates before payments begin. */
  hasBalance: boolean;
}

export const INCOME_SOURCE_TYPE_RULES: Record<IncomeSourceType, IncomeSourceTypeRules> = {
  'social-security': {
    taxDescription:
      'Social Security benefits are based on your lifetime earnings record and paid monthly for life. Depending on your total income, up to 85% of your benefit can be taxed as ordinary income.',
    paymentTaxTreatment: 'Partly taxed as ordinary income',
    paymentDuration: 'For life',
    startAgeMin: 62,
    startAgeMax: 70,
    hasBalance: false,
  },
  pension: {
    taxDescription:
      'A pension pays a set monthly benefit from an employer plan, usually for life. Payments are generally taxed as ordinary income, less any portion you funded with after-tax dollars.',
    paymentTaxTreatment: 'Taxed as ordinary income',
    paymentDuration: 'For life',
    startAgeMin: null,
    startAgeMax: null,
    hasBalance: false,
  },
  annuity: {
    taxDescription:
      'An annuity converts a balance into guaranteed monthly income. If it was bought with pre-tax retirement money, every payment is taxed as ordinary income; if it was bought with after-tax money, only the earnings portion of each payment is taxed.',
    paymentTaxTreatment: 'Depends on how it was funded',
    paymentDuration: 'For life',
    startAgeMin: null,
    startAgeMax: null,
    hasBalance: true,
  },
};

/**
 * A new source's starting values. Social Security's COLA tracks inflation by
 * design, so it starts at the household's inflation assumption; a pension
 * and an annuity typically pay a fixed amount, so they start at 0%.
 */
export function defaultIncomeSource(
  type: IncomeSourceType,
  ctx: { ageToday: number; lifeExpectancy: number; annualInflation: number },
  existingOfType = 0
): Omit<IncomeSource, 'id'> {
  const rules = INCOME_SOURCE_TYPE_RULES[type];
  const preferredStartAge = type === 'social-security' ? 67 : 65;
  const min = Math.max(rules.startAgeMin ?? ctx.ageToday, ctx.ageToday);
  const max = Math.min(rules.startAgeMax ?? ctx.lifeExpectancy - 1, ctx.lifeExpectancy - 1);

  return {
    type,
    name: `${INCOME_SOURCE_TYPE_LABELS[type]} ${existingOfType + 1}`,
    ownerName: '',
    startAge: Math.min(Math.max(preferredStartAge, min), Math.max(min, max)),
    monthlyBenefit: type === 'social-security' ? 2000 : 1500,
    cola: type === 'social-security' ? ctx.annualInflation : 0,
    currentBalance: 100000,
    monthlyContribution: 0,
    growthRate: 4,
    payoutRate: 6,
  };
}
