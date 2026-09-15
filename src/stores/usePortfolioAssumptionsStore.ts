import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";

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

function definePortfolioAssumptionsStore(id: string, persist: boolean) {
  return defineStore(id, () => {
    const isDescribed = ref<boolean>(false);

    const annualIncome = ref<number>(100000);
    const annualRaises = ref<number>(1);
    const ageToday = ref<number>(25);
    const lifeExpectancy = ref<number>(90);
    const annualInflation = ref<number>(2.5);

    // The point contributions/income stop for every account; also the end of
    // the Bridge stage (see useAccountStore's per-account withdrawal start
    // age, which may fall before this for an early-access account).
    const retirementAge = ref<number>(60);

    // Income-replacement rates by stage, shared by every account.
    const incomeReplacementBridge = ref<number>(30);
    const incomeReplacementGoGo = ref<number>(125);
    const incomeReplacementSlowGo = ref<number>(100);
    const incomeReplacementNoGo = ref<number>(75);

    const overrideRetirementBoundaries = ref<number[] | null>(null);

    const yearsInRetirement = computed(() => lifeExpectancy.value - retirementAge.value);

    // Go-Go/Slow-Go/No-Go boundary ages: defaults to a 40/40/20 split of the
    // retirement span, but stores an override when the slider is moved (see
    // the watch below, which clears it if the ages move it out of range).
    const retirementBoundaries = computed<number[]>({
      get() {
        if (overrideRetirementBoundaries.value) {
          return overrideRetirementBoundaries.value;
        }

        const baseYrs = (yearsInRetirement.value * 2.0) / 5.0;

        return [
          Math.floor(baseYrs),
          Math.floor(baseYrs) * 2
        ].map((yr) => yr + retirementAge.value);
      },

      set(newValue: number[]) {
        overrideRetirementBoundaries.value = newValue;
      }
    });

    const yearsInGoGo = computed(() => {
      const def = retirementAge.value;
      return (retirementBoundaries.value[0] ?? def) - def;
    });

    const yearsInSlowGo = computed(() => {
      const def = yearsInGoGo.value + retirementAge.value;
      return (retirementBoundaries.value[1] ?? def) - def;
    });

    const yearsInNoGo = computed(
      () => yearsInRetirement.value - yearsInSlowGo.value - yearsInGoGo.value
    );

    watch(
      [yearsInRetirement, retirementAge, lifeExpectancy],
      () => {
        if (!overrideRetirementBoundaries.value) return;

        const [b1, b2] = overrideRetirementBoundaries.value;

        const min = retirementAge.value;
        const max = lifeExpectancy.value;

        const outOfRange = (b1 ?? 0) < min || (b2 ?? 0) > max;

        if (outOfRange) {
          overrideRetirementBoundaries.value = null;
        }
      },
      { deep: false }
    );

    function markDescribed() {
      isDescribed.value = true;
    }

    return {
      isDescribed,
      annualIncome,
      annualRaises,
      ageToday,
      lifeExpectancy,
      annualInflation,
      retirementAge,
      incomeReplacementBridge,
      incomeReplacementGoGo,
      incomeReplacementSlowGo,
      incomeReplacementNoGo,
      retirementBoundaries,
      yearsInRetirement,
      yearsInGoGo,
      yearsInSlowGo,
      yearsInNoGo,
      markDescribed,
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
  target.annualIncome = source.annualIncome;
  target.annualRaises = source.annualRaises;
  target.ageToday = source.ageToday;
  target.lifeExpectancy = source.lifeExpectancy;
  target.annualInflation = source.annualInflation;
  target.retirementAge = source.retirementAge;
  target.incomeReplacementBridge = source.incomeReplacementBridge;
  target.incomeReplacementGoGo = source.incomeReplacementGoGo;
  target.incomeReplacementSlowGo = source.incomeReplacementSlowGo;
  target.incomeReplacementNoGo = source.incomeReplacementNoGo;
  target.retirementBoundaries = [...source.retirementBoundaries];
}
