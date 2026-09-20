import { defineStore } from "pinia";
import { ref, computed } from "vue";

// Assumptions shared by every account in the portfolio (as opposed to
// account-level fields like balance, growth rate, or withdrawal share, which
// live on each account's own store — see useAccountStore.ts). Must be
// described once, via PortfolioAssumptionsModal, before accounts can be
// added; see `isDescribed`.
//
// Defined as a store factory (like useAccountStore) rather than a plain
// singleton so the assumptions modal can edit a throwaway draft instance —
// with its own working copy of every computed value — and only copy it onto
// the real store when Done is clicked. See useDraftPortfolioAssumptionsStore.
const portfolioAssumptionsDefs = new Map<
  string,
  ReturnType<typeof definePortfolioAssumptionsStore>
>();

/**
 * One named source of income (a job, a side gig, a partner's income, etc.).
 * `annualIncome` is derived as the sum of every stream's `annualAmount`, and
 * `annualRaises` as their amount-weighted average raise rate — see below.
 * Each stream keeps its own raise rate since different income sources don't
 * necessarily grow at the same pace.
 */
export interface IncomeStream {
  id: string;
  name: string;
  annualAmount: number;
  annualRaises: number;
}

function definePortfolioAssumptionsStore(id: string, persist: boolean) {
  return defineStore(id, () => {
    const isDescribed = ref<boolean>(false);

    const incomeStreams = ref<IncomeStream[]>([
      { id: crypto.randomUUID(), name: 'Primary Income', annualAmount: 100000, annualRaises: 1 },
    ]);

    // Total household income — the sum of every stream. Read-only: add,
    // remove, or edit a stream instead of setting this directly.
    const annualIncome = computed(() =>
      incomeStreams.value.reduce((sum, s) => sum + s.annualAmount, 0)
    );

    // A single blended raise rate for wherever the rest of the app still
    // needs one flat number (the income-replacement target at retirement,
    // and escalating an account's percent-of-income contribution) — the
    // amount-weighted average of every stream's own rate, so a raise on a
    // small side gig doesn't move the household figure as much as a raise on
    // the primary income. Falls back to 0 if every stream is $0 (or there
    // are none), rather than dividing by zero.
    const annualRaises = computed(() => {
      const total = annualIncome.value;
      if (total <= 0) return 0;
      return (
        incomeStreams.value.reduce((sum, s) => sum + s.annualAmount * s.annualRaises, 0) / total
      );
    });

    const ageToday = ref<number>(25);
    const lifeExpectancy = ref<number>(90);
    const annualInflation = ref<number>(2.5);

    function markDescribed() {
      isDescribed.value = true;
    }

    function addIncomeStream() {
      incomeStreams.value.push({
        id: crypto.randomUUID(),
        name: `Income ${incomeStreams.value.length + 1}`,
        annualAmount: 0,
        annualRaises: 1,
      });
    }

    function removeIncomeStream(streamId: string) {
      incomeStreams.value = incomeStreams.value.filter((s) => s.id !== streamId);
    }

    // Resets every field to its initial default, including `isDescribed` —
    // used by the "start over" action, which also clears every account (see
    // usePortfolioStore.clearAllAccounts).
    function resetToDefaults() {
      isDescribed.value = false;
      incomeStreams.value = [
        { id: crypto.randomUUID(), name: 'Primary Income', annualAmount: 100000, annualRaises: 1 },
      ];
      ageToday.value = 25;
      lifeExpectancy.value = 90;
      annualInflation.value = 2.5;
    }

    return {
      isDescribed,
      incomeStreams,
      annualIncome,
      annualRaises,
      addIncomeStream,
      removeIncomeStream,
      ageToday,
      lifeExpectancy,
      annualInflation,
      markDescribed,
      resetToDefaults,
    };
  }, persist ? { persist: true } : {});
}

function getPortfolioAssumptionsStore(id: string, persist: boolean) {
  let def = portfolioAssumptionsDefs.get(id);
  if (!def) {
    def = definePortfolioAssumptionsStore(id, persist);
    portfolioAssumptionsDefs.set(id, def);
  }
  return def();
}

/** Get (or lazily create) the single persisted portfolio assumptions store. */
export function usePortfolioAssumptionsStore() {
  return getPortfolioAssumptionsStore("portfolio-assumptions", true);
}

// A scratch store for the assumptions modal: edits are staged here and only
// copied onto the real store (via copyAssumptionsFields) when Done is
// clicked, so closing the modal any other way discards them. Never
// persisted; a fresh instance is minted per modal session (see
// PortfolioAssumptionsModal.vue, which disposes it on close).
export function useDraftPortfolioAssumptionsStore() {
  return getPortfolioAssumptionsStore(`portfolio-assumptions-draft-${crypto.randomUUID()}`, false);
}

export type PortfolioAssumptionsInstance = ReturnType<typeof usePortfolioAssumptionsStore>;

/** Copies every editable field from one portfolio assumptions store to another. */
export function copyAssumptionsFields(
  source: PortfolioAssumptionsInstance,
  target: PortfolioAssumptionsInstance
) {
  // annualIncome/annualRaises are derived from incomeStreams (read-only) —
  // copy the streams themselves, each as a new object so the draft and the
  // real store never share references.
  target.incomeStreams = source.incomeStreams.map((s) => ({ ...s }));
  target.ageToday = source.ageToday;
  target.lifeExpectancy = source.lifeExpectancy;
  target.annualInflation = source.annualInflation;
}
