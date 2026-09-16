import type { AccountType } from '@/stores/useAccountStore';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  traditional: 'Traditional',
  roth: 'Roth',
  brokerage: 'Brokerage',
};
