import { defineStore } from "pinia";
import { ref } from "vue";

// Assumptions shared by every account in the portfolio (as opposed to
// account-level fields like balance, growth rate, or withdrawal rate, which
// live on each account's own store — see useAccountStore.ts). Must be
// described once, via PortfolioAssumptionsModal, before accounts can be
// added; see `isDescribed`.
export const usePortfolioAssumptionsStore = defineStore("portfolio-assumptions", () => {
  const isDescribed = ref<boolean>(false);

  const annualIncome = ref<number>(100000);
  const annualRaises = ref<number>(1);
  const ageToday = ref<number>(25);
  const lifeExpectancy = ref<number>(90);
  const annualInflation = ref<number>(2.5);

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
    markDescribed,
  };
}, { persist: true });
