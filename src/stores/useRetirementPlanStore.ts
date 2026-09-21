import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

import { usePortfolioStore } from '@/stores/usePortfolioStore';
import { usePortfolioAssumptionsStore } from '@/stores/usePortfolioAssumptionsStore';
import {
  STAGE_PRESETS,
  nextStageColor,
  type Stage,
  type StagePresetKey,
} from '@/composeables/useStages';
import {
  addAccountShare,
  removeAccountShare,
  normalizeShares,
  type ShareMap,
} from '@/composeables/useWithdrawalShares';

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

    // Starts empty: a fresh plan has no stages until the user adds one (via
    // the "+" in the Retirement Plan section, which offers the Go-Go/Slow-Go/
    // No-Go presets), so everything stays in Accumulation until then.
    const stages = ref<Stage[]>([]);

    // The retirementAge replacement — when the paycheck stops and the
    // withdrawal timeline begins. Null only when the user has deleted every
    // stage.
    const firstStageStartAge = computed<number | null>(() => stages.value[0]?.startAge ?? null);

    function sortStages() {
      stages.value.sort((a, b) => a.startAge - b.startAge);
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
        // Nothing is drawn on until the user toggles an account on.
        withdrawalShareByAccount: {},
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

    // Empties the stage list without touching anything else — Context,
    // Accounts, and portfolio assumptions are untouched. Also what "Reset
    // Portfolio" uses, since an empty list is the fresh-install default. See
    // PortfolioView.vue's "Clear all stages" action, which mirrors
    // usePortfolioStore's clearAllAccounts.
    function clearStages() {
      stages.value = [];
    }

    function stageById(stageId: string) {
      return stages.value.find((s) => s.id === stageId);
    }

    // Turns an account on/off for a stage. Turning one on gives it an even
    // slice and the others shrink proportionally; turning one off hands its
    // slice back proportionally — see useWithdrawalShares.ts.
    function setAccountEnabled(stageId: string, accountId: string, enabled: boolean) {
      const stage = stageById(stageId);
      if (!stage) return;
      stage.withdrawalShareByAccount = enabled
        ? addAccountShare(stage.withdrawalShareByAccount, accountId)
        : removeAccountShare(stage.withdrawalShareByAccount, accountId);
    }

    /** Replaces a stage's shares wholesale (the share slider hands back the whole, already-valid split). */
    function setShares(stageId: string, shares: ShareMap) {
      const stage = stageById(stageId);
      if (stage) stage.withdrawalShareByAccount = shares;
    }

    // Keeps every stage's shares valid — only real accounts, each at least
    // MIN_SHARE, summing to exactly 100 (or empty) — no matter how they got
    // that way: an account being deleted, or a plan saved back when every
    // account sat at its own independent 100%. Every valid map passes through
    // untouched, so the toggles and slider never fight this. It watches the
    // stages too (not just the accounts) because saved stages hydrate after
    // this store is created.
    watch(
      [() => portfolio.accounts.map((a) => a.id), () => stages.value.map((s) => s.withdrawalShareByAccount)],
      () => {
        const validIds = new Set(portfolio.accounts.map((a) => a.id));
        for (const stage of stages.value) {
          const fixed = normalizeShares(stage.withdrawalShareByAccount, validIds);
          if (fixed !== stage.withdrawalShareByAccount) stage.withdrawalShareByAccount = fixed;
        }
      },
      { immediate: true, deep: true }
    );

    return {
      stages,
      firstStageStartAge,
      addStage,
      removeStage,
      moveBoundary,
      setAccountEnabled,
      setShares,
      clearStages,
    };
  },
  { persist: true }
);
