import { defineStore } from "pinia";
import { ref } from "vue";

export interface AccountMeta {
  id: string;
  name: string;
}

export const usePortfolioStore = defineStore("portfolio", () => {
  const accounts = ref<AccountMeta[]>([]);

  function addAccount(name?: string): string {
    const id = crypto.randomUUID();
    accounts.value.push({
      id,
      name: name ?? `Account ${accounts.value.length + 1}`,
    });
    return id;
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
    addAccount,
    removeAccount,
    renameAccount,
    clearAllAccounts,
  };
}, { persist: true });
