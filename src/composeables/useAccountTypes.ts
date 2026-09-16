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

// A distinct icon per account type so it reads at a glance next to the name
// (e.g. in the Portfolio breakdown's column headers): a landmark for
// pre-tax/employer-style Traditional accounts, a sprout for Roth's tax-free
// growth, and a trending-up chart for a taxable Brokerage account.
export const ACCOUNT_TYPE_ICONS: Record<AccountType, Component> = {
  traditional: LandmarkIcon,
  roth: SproutIcon,
  brokerage: TrendingUpIcon,
};
