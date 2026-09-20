import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import {
  STAGE_PRESETS,
  STAGE_COLOR_PALETTE,
  nextStageColor,
  type Stage,
  type StagePresetKey,
} from '@/composeables/useStages';

// The user-defined stages covering the withdrawal side of the timeline (see
// useStages.ts for why Accumulation isn't one of them). A new, dedicated
// store rather than folding into usePortfolioAssumptionsStore: that store
// has an established draft/commit regime (useDraftPortfolioAssumptionsStore),
// but stages are meant to be live-edited with no draft step (see
// StageFormModal.vue/StageCard.vue) — a separate store keeps that
// edit-semantics boundary a store boundary.
export const useRetirementPlanStore = defineStore(
  'retirement-plan',
  () => {
    const assumptions = usePortfolioAssumptionsStore();
    const portfolio = usePortfolioStore();

    const stages = ref<Stage[]>(seededDefaultStages());

    // The retirementAge replacement — when the paycheck stops and the
    // withdrawal timeline begins. Null only when the user has deleted every
    // stage.
    const firstStageStartAge = computed<number | null>(() => stages.value[0]?.startAge ?? null);

    function sortStages() {
      stages.value.sort((a, b) => a.startAge - b.startAge);
    }

    function defaultShareMap(): Record<string, number> {
      const map: Record<string, number> = {};
      for (const a of portfolio.accounts) map[a.id] = 100;
      return map;
    }

    // Where a newly added stage starts: right after the current last stage,
    // splitting its remaining span in half so the new stage has room to
    // exist without pushing the timeline past life expectancy (coverage must
    // stay gap-free and can't extend past lifeExpectancy). With no stages
    // yet, falls back to today's old default retirement age.
    function nextDefaultStartAge(): number {
      const lifeExpectancy = assumptions.lifeExpectancy;
      const last = stages.value[stages.value.length - 1];
      if (!last) return Math.min(60, lifeExpectancy - 1);
      const remaining = lifeExpectancy - last.startAge;
      return last.startAge + Math.max(1, Math.floor(remaining / 2));
    }

    /** Adds a stage seeded from a preset, or a blank "Custom" stage when presetKey is 'custom'. */
    function addStage(presetKey: StagePresetKey | 'custom'): string {
      const preset = presetKey === 'custom' ? null : STAGE_PRESETS.find((p) => p.key === presetKey) ?? null;
      const stage: Stage = {
        id: crypto.randomUUID(),
        name: preset?.name ?? '',
        description: preset?.description ?? '',
        startAge: nextDefaultStartAge(),
        color: nextStageColor(stages.value),
        incomeReplacementRate: preset?.incomeReplacementRate ?? 100,
        withdrawalShareByAccount: defaultShareMap(),
      };
      stages.value.push(stage);
      sortStages();
      return stage.id;
    }

    function removeStage(id: string) {
      stages.value = stages.value.filter((s) => s.id !== id);
    }

    // The only place a stage's startAge is ever set directly — endAge is
    // always derived (see stageEndAge), so keeping every neighbor's implied
    // boundary in sync is just clamping this one value between its
    // neighbors, with no separate contiguity check needed anywhere else.
    function moveBoundary(stageId: string, newStartAge: number) {
      const index = stages.value.findIndex((s) => s.id === stageId);
      if (index === -1) return;

      const lowerNeighbor = index > 0 ? stages.value[index - 1]!.startAge : assumptions.ageToday;
      const upperNeighbor =
        index < stages.value.length - 1 ? stages.value[index + 1]!.startAge : assumptions.lifeExpectancy;

      // Every stage (including this one and its lower neighbor, if any)
      // needs at least a 1-year span.
      const min = index > 0 ? lowerNeighbor + 1 : lowerNeighbor;
      const max = Math.max(min, upperNeighbor - 1);

      stages.value[index]!.startAge = Math.min(Math.max(newStartAge, min), max);
    }

    function seededDefaultStages(): Stage[] {
      // Mirrors the old 40/40/20 split default (usePortfolioAssumptionsStore's
      // former retirementBoundaries formula), just materialized as real
      // Stage records instead of a boundary tuple.
      const retirementAgeDefault = 60;
      const lifeExpectancy = assumptions?.lifeExpectancy ?? 90;
      const yearsInRetirement = lifeExpectancy - retirementAgeDefault;
      const baseYears = Math.floor((yearsInRetirement * 2) / 5);
      const goGoEndAge = retirementAgeDefault + baseYears;
      const slowGoEndAge = goGoEndAge + baseYears;

      const gogo = STAGE_PRESETS.find((p) => p.key === 'gogo')!;
      const slowgo = STAGE_PRESETS.find((p) => p.key === 'slowgo')!;
      const nogo = STAGE_PRESETS.find((p) => p.key === 'nogo')!;

      return [
        {
          id: crypto.randomUUID(),
          name: gogo.name,
          description: gogo.description,
          startAge: retirementAgeDefault,
          color: STAGE_COLOR_PALETTE[1]!,
          incomeReplacementRate: gogo.incomeReplacementRate,
          withdrawalShareByAccount: {},
        },
        {
          id: crypto.randomUUID(),
          name: slowgo.name,
          description: slowgo.description,
          startAge: goGoEndAge,
          color: STAGE_COLOR_PALETTE[2]!,
          incomeReplacementRate: slowgo.incomeReplacementRate,
          withdrawalShareByAccount: {},
        },
        {
          id: crypto.randomUUID(),
          name: nogo.name,
          description: nogo.description,
          startAge: slowGoEndAge,
          color: STAGE_COLOR_PALETTE[3]!,
          incomeReplacementRate: nogo.incomeReplacementRate,
          withdrawalShareByAccount: {},
        },
      ];
    }

    // Used for every fresh store's own default state (fresh install, no
    // migration from the old schema) — see resetToDefaults, and
    // PortfolioView.vue's "Reset Portfolio" action.
    function resetToDefaults() {
      stages.value = seededDefaultStages();
    }

    // Empties the stage list without touching anything else — Context,
    // Accounts, and portfolio assumptions are untouched. See
    // PortfolioView.vue's "Clear all stages" action, which mirrors
    // usePortfolioStore's clearAllAccounts (empty, not reseeded).
    function clearStages() {
      stages.value = [];
    }

    // Keeps every stage's withdrawalShareByAccount map in sync with which
    // accounts actually exist: a newly added account gets seeded at 100% in
    // every existing stage (so it doesn't silently contribute 0%), and a
    // removed account's key is pruned from every stage (its withdrawal share
    // data has nowhere else to live and shouldn't linger). Runs immediately
    // so a fresh store's seeded default stages pick up whatever accounts
    // already exist.
    watch(
      () => portfolio.accounts.map((a) => a.id),
      (currentIds) => {
        const idSet = new Set(currentIds);
        for (const stage of stages.value) {
          for (const id of currentIds) {
            if (!(id in stage.withdrawalShareByAccount)) stage.withdrawalShareByAccount[id] = 100;
          }
          for (const id of Object.keys(stage.withdrawalShareByAccount)) {
            if (!idSet.has(id)) delete stage.withdrawalShareByAccount[id];
          }
        }
      },
      { immediate: true }
    );

    return {
      stages,
      firstStageStartAge,
      addStage,
      removeStage,
      moveBoundary,
      resetToDefaults,
      clearStages,
    };
  },
  { persist: true }
);
