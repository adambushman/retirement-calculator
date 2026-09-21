import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { IncomeSource } from '@/composeables/useIncomeSources';

// The household's income sources (Social Security, pensions, annuities) —
// deliberately its own store rather than more entries in usePortfolioStore's
// account list, since none of the account machinery (balances withdrawn by
// stage shares, per-account growth phases, withdrawal-share maps) applies to
// them. See useIncomeSources.ts for how they pay out.
//
// Records are plain objects edited through the draft-then-commit
// IncomeSourceFormModal, so there's no per-record store like accounts have.
export const useIncomeSourcesStore = defineStore(
  'income-sources',
  () => {
    const sources = ref<IncomeSource[]>([]);

    function addSource(fields: Omit<IncomeSource, 'id'>): string {
      const id = crypto.randomUUID();
      sources.value.push({ ...fields, id });
      return id;
    }

    function updateSource(id: string, fields: Omit<IncomeSource, 'id'>) {
      const existing = sources.value.find((s) => s.id === id);
      if (existing) Object.assign(existing, fields);
    }

    function removeSource(id: string) {
      sources.value = sources.value.filter((s) => s.id !== id);
    }

    function clearAll() {
      sources.value = [];
    }

    return { sources, addSource, updateSource, removeSource, clearAll };
  },
  { persist: true }
);
