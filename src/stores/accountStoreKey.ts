import type { InjectionKey } from 'vue';
import type { useAccountStore } from '@/stores/useAccountStore';

// Lets a scoped account store (created once per account id in
// AccountWorkspace.vue) reach the leaf components that used to call the old
// global useRetirementStore() directly, without threading accountId through
// every intermediate component's props.
export const AccountStoreKey: InjectionKey<ReturnType<typeof useAccountStore>> =
  Symbol('account-store');
