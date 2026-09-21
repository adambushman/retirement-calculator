import { defineStore } from "pinia";
import { ref, watch } from "vue";

import { nextAccountColor } from "@/composeables/useAccountColors";

export interface AccountMeta {
  id: string;
  name: string;
  color: string;
}

export const usePortfolioStore = defineStore("portfolio", () => {
  const accounts = ref<AccountMeta[]>([]);

  function addAccount(name?: string): string {
    const id = crypto.randomUUID();
    accounts.value.push({
      id,
      name: name ?? `Account ${accounts.value.length + 1}`,
      color: nextAccountColor(accounts.value.map((a) => a.color)),
    });
    return id;
  }

  // Accounts saved before colors existed come back from storage without one;
  // give each the first unused color, once, so it's stable from then on
  // (rather than derived from list position, which would recolor every
  // account after a deletion).
  watch(
    accounts,
    (list) => {
      for (const account of list) {
        if (!account.color) {
          account.color = nextAccountColor(list.map((a) => a.color).filter(Boolean));
        }
      }
    },
    { deep: true, immediate: true, flush: 'sync' }
  );

  function colorFor(id: string): string | undefined {
    return accounts.value.find((a) => a.id === id)?.color;
  }

  function removeAccount(id: string) {
    accounts.value = accounts.value.filter((a) => a.id !== id);
    // Each account persists itself under its own store id (see
    // useAccountStore.ts) — clear it so removal doesn't leave orphaned data.
    localStorage.removeItem(`account-${id}`);
  }

  function renameAccount(id: string, name: string) {
    const account = accounts.value.find((a) => a.id === id);
    if (account) account.name = name;
  }

  function clearAllAccounts() {
    accounts.value.forEach((a) => localStorage.removeItem(`account-${a.id}`));
    accounts.value = [];
  }

  return {
    accounts,
    colorFor,
    addAccount,
    removeAccount,
    renameAccount,
    clearAllAccounts,
  };
}, { persist: true });
