import { computed } from 'vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { useAccountStore } from '@/stores/useAccountStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { useIncomeSourcesStore } from '@/stores/useIncomeSourcesStore';
import { resolveIncomeSource } from '@/composeables/useIncomeSources';
import { accountsTargetAnnual, type PortfolioProjectionAssumptions } from '@/composeables/useAccountProjection';
import { stageEndAge, type Stage } from '@/composeables/useStages';

// A stage's withdrawal shares always sum to exactly 100% of its target once
// at least one account is toggled on (see useWithdrawalShares.ts), so in a
// healthy year every account combined draws exactly the target — no more,
// no less. A shortfall can therefore only ever come from one of two places:
// no account being toggled on at all, or the toggled-on accounts running out
// of balance faster than the target calls for (the redistribution in
// computePortfolioSimulation covers for a depleted account with its still-
// solvent siblings, but once a survivor's own balance runs out too, there's
// nothing left to redistribute to). Read straight off each account's own
// already-computed rows rather than re-simulating anything.

// Below this, in dollars/month, treat a stage as fully funded — guards
// against a fraction-of-a-cent shortfall from floating-point noise
// accumulated across decades of compounding registering as a real gap.
const SHORTFALL_THRESHOLD = 1;

// Below this, in total dollars across the stage, treat penalties as none —
// same floating-point guard as above, applied to a whole-stage total rather
// than a monthly figure.
const PENALTY_THRESHOLD = 1;

export function useStageFunding() {
  const portfolio = usePortfolioStore();
  const assumptions = usePortfolioAssumptionsStore();
  const retirementPlan = useRetirementPlanStore();
  const incomeSources = useIncomeSourcesStore();

  const accountStores = computed(() => portfolio.accounts.map((a) => useAccountStore(a.id)));

  const projectionAssumptions = computed<PortfolioProjectionAssumptions>(() => ({
    ageToday: assumptions.ageToday,
    lifeExpectancy: assumptions.lifeExpectancy,
    firstStageStartAge: retirementPlan.firstStageStartAge ?? assumptions.lifeExpectancy,
    annualIncome: assumptions.annualIncome,
    annualRaises: assumptions.annualRaises,
    stages: retirementPlan.stages,
    annualInflation: assumptions.annualInflation,
    incomeSources: incomeSources.sources.map((s) => resolveIncomeSource(s, assumptions)),
    growthRateIntraRetirement: retirementPlan.growthRateIntraRetirement,
  }));

  /**
   * The largest monthly shortfall this stage ever runs during its own span
   * — the worst single year's gap between its (inflation-indexed, guaranteed-
   * income-offset) target and what its toggled-on accounts actually manage
   * to pay that year — or 0 if the target is fully met throughout. Nominal
   * dollars throughout (matching `raw`, not inflation-adjusted, rows), since
   * the target itself is already a nominal figure — see accountsTargetAnnual.
   */
  function monthlyShortfallFor(stage: Stage): number {
    const index = retirementPlan.stages.findIndex((s) => s.id === stage.id);
    if (index === -1) return 0;

    const ctx = projectionAssumptions.value;
    const endAge = stageEndAge(retirementPlan.stages, index, assumptions.lifeExpectancy);

    let maxShortfallAnnual = 0;
    for (let age = stage.startAge; age < endAge; age++) {
      const rowIndex = age - ctx.ageToday;
      if (rowIndex < 0) continue;

      // Already net of the guaranteed income sources — see accountsTargetAnnual.
      const target = accountsTargetAnnual(ctx, stage, age);
      if (target <= 0) continue;

      const actual = accountStores.value.reduce((sum, s) => {
        const row = s.futureProjection.raw?.[rowIndex];
        return row && row.stage === stage.id ? sum + Math.max(0, -row.annualFlow) : sum;
      }, 0);

      maxShortfallAnnual = Math.max(maxShortfallAnnual, target - actual);
    }

    return maxShortfallAnnual / 12;
  }

  function hasShortfall(stage: Stage): boolean {
    return monthlyShortfallFor(stage) > SHORTFALL_THRESHOLD;
  }

  /**
   * Total early-withdrawal penalties this stage racks up across its own
   * span, in nominal dollars (matching `raw`, same basis as the shortfall
   * figures above). Read off the rows the simulation already charged rather
   * than re-deriving which ages are penalized — see penaltyRateAtAge.
   */
  function penaltiesFor(stage: Stage): number {
    const index = retirementPlan.stages.findIndex((s) => s.id === stage.id);
    if (index === -1) return 0;

    const endAge = stageEndAge(retirementPlan.stages, index, assumptions.lifeExpectancy);
    let total = 0;
    for (let age = stage.startAge; age < endAge; age++) {
      const rowIndex = age - assumptions.ageToday;
      if (rowIndex < 0) continue;
      for (const s of accountStores.value) {
        const row = s.futureProjection.raw?.[rowIndex];
        if (row && row.stage === stage.id) total += row.penalty;
      }
    }
    return total;
  }

  function hasPenalties(stage: Stage): boolean {
    return penaltiesFor(stage) > PENALTY_THRESHOLD;
  }

  return { monthlyShortfallFor, hasShortfall, penaltiesFor, hasPenalties };
}
