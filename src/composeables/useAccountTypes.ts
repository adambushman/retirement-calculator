import type { Component } from 'vue';

import type { AccountType } from '@/stores/useAccountStore';
import LandmarkIcon from '@/components/icons/LandmarkIcon.vue';
import SproutIcon from '@/components/icons/SproutIcon.vue';
import TrendingUpIcon from '@/components/icons/TrendingUpIcon.vue';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  traditional: 'Traditional',
  roth: 'Roth',
  brokerage: 'Brokerage',
};

// Shared display order for anywhere accounts are grouped/bucketed by type
// (e.g. PortfolioSummary's by-type columns, StageCard's withdrawal-share
// grouping).
export const ACCOUNT_TYPE_ORDER: AccountType[] = ['traditional', 'roth', 'brokerage'];

export interface AccountTypeRules {
  /** One or two sentence summary of how contributions/growth/withdrawals are taxed. */
  taxDescription: string;
  /** How contributions are taxed going in. Descriptive only — not used in calculations. */
  contributionTaxTreatment: string;
  /** How withdrawals are taxed coming out. Descriptive only — not used in calculations. */
  withdrawalTaxTreatment: string;
  /**
   * Age at which withdrawals stop being subject to the early-withdrawal
   * penalty. `null` means no penalty age applies at all (Brokerage). Kept as
   * a number (not baked into the description) so it can be compared directly
   * against an account's withdrawalStartAge.
   *
   * Simplification: for Roth, contributions themselves can actually be
   * withdrawn tax/penalty-free at any age — only earnings are restricted
   * until 59½. Accounts here are tracked as a single lump balance with no
   * separate contribution/earnings basis, so this applies 59½ to the whole
   * balance rather than modeling that split.
   */
  penaltyFreeWithdrawalAge: number | null;
  /**
   * Early-withdrawal penalty as a percent of the withdrawal (e.g. 10 means
   * 10%). `null` means no penalty applies. A number, not a string, so it can
   * be used directly in a penalty calculation.
   */
  earlyWithdrawalPenaltyRate: number | null;
}

export const ACCOUNT_TYPE_RULES: Record<AccountType, AccountTypeRules> = {
  traditional: {
    taxDescription:
      'Traditional accounts are funded with pre-tax dollars, which reduces your taxable income today. The full balance — original contributions plus all growth — is taxed as ordinary income when you withdraw it.',
    contributionTaxTreatment: 'Pre-tax',
    withdrawalTaxTreatment: 'Taxed as ordinary income',
    penaltyFreeWithdrawalAge: 59.5,
    earlyWithdrawalPenaltyRate: 10,
  },
  roth: {
    taxDescription:
      'Roth accounts are funded with after-tax dollars, so qualified withdrawals — including every dollar of growth — come out completely tax-free.',
    contributionTaxTreatment: 'Post-tax',
    withdrawalTaxTreatment: 'Tax-free (qualified)',
    penaltyFreeWithdrawalAge: 59.5,
    earlyWithdrawalPenaltyRate: 10,
  },
  brokerage: {
    taxDescription:
      'Brokerage accounts are funded with after-tax dollars. No contribution limits and no withdrawal age restrictions — but investment growth is subject to capital gains tax when sold.',
    contributionTaxTreatment: 'After-tax, no special treatment',
    withdrawalTaxTreatment: 'Capital gains tax on growth only',
    penaltyFreeWithdrawalAge: null,
    earlyWithdrawalPenaltyRate: null,
  },
};

// A distinct icon per account type so it reads at a glance next to the name
// (e.g. in the Portfolio breakdown's column headers): a landmark for
// pre-tax/employer-style Traditional accounts, a sprout for Roth's tax-free
// growth, and a trending-up chart for a taxable Brokerage account.
export const ACCOUNT_TYPE_ICONS: Record<AccountType, Component> = {
  traditional: LandmarkIcon,
  roth: SproutIcon,
  brokerage: TrendingUpIcon,
};
