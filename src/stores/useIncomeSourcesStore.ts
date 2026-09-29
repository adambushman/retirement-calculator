import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import type { IncomeSource } from '@/composeables/useIncomeSources';
import { claimingFactorAt } from '@/composeables/useSocialSecurity';

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

    // A Social Security source saved before primaryInsuranceAmount existed
    // comes back from storage without one (this array is persisted and
    // hydrated wholesale, not per-field — see the module comment). Backfill
    // it once, per source, from the OLD monthlyBenefit — but reversing the
    // claiming-age adjustment at its own already-chosen startAge, rather
    // than copying the number straight across. The old model paid
    // monthlyBenefit as-is at any age, equivalent to claiming exactly at
    // Full Retirement Age; dividing out that age's claiming factor recovers
    // the PIA that reproduces the SAME monthly benefit the user already
    // configured and has been seeing, so nothing changes for them today —
    // only moving the age slider from here behaves differently than before.
    watch(
      sources,
      (list) => {
        for (const source of list) {
          if (source.type === 'social-security' && !source.primaryInsuranceAmount) {
            source.primaryInsuranceAmount = source.monthlyBenefit / (claimingFactorAt(source.startAge) / 100);
          }
        }
      },
      { deep: true, immediate: true, flush: 'sync' }
    );

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
