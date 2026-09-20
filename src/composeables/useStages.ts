// A stage the user has defined for the withdrawal side of their retirement
// timeline (see useRetirementPlanStore.ts). This file has no knowledge of
// *which* stages exist — that's user data now — it only holds shared
// utilities: a color palette to auto-assign from, the named presets offered
// by the "+" modal, and the sentinel identity for Accumulation, which stays
// an implicit phase rather than a Stage a user can edit.
export interface Stage {
  id: string;
  name: string;
  description: string;
  /** Inclusive. This stage's end is always derived — see stageEndAge. */
  startAge: number;
  color: string;
  /** % of the last-accumulation-year income this stage targets. */
  incomeReplacementRate: number;
  /** accountId -> % (0-100) of this stage's target this account covers. */
  withdrawalShareByAccount: Record<string, number>;
}

// Accumulation is never a Stage object — it's everything before the first
// user-defined stage's startAge — but it still needs a stable id/color/label
// so it can flow through the same stageId-keyed maps (chart, breakdown,
// stageResults) as a real stage, without a parallel code path everywhere.
export const ACCUMULATION_ID = '__accumulation__';
export const ACCUMULATION_LABEL = 'Accumulation';
export const ACCUMULATION_COLOR = '#f87171';
export const ACCUMULATION_DESCRIPTION =
  "Everything before this account's withdrawal start age — contributions arrive while you're still working, and the balance keeps compounding untouched even after your first stage begins, right up until the first withdrawal.";

// Auto-assigned to a stage at creation, in order, cycling once every color
// has been used at least once.
export const STAGE_COLOR_PALETTE = [
  '#fb923c', '#60a5fa', '#5eead4', '#facc15',
  '#a78bfa', '#f472b6', '#34d399', '#fb7185',
];

export function nextStageColor(existingStages: Stage[]): string {
  const used = new Set(existingStages.map((s) => s.color));
  const unused = STAGE_COLOR_PALETTE.find((c) => !used.has(c));
  return unused ?? STAGE_COLOR_PALETTE[existingStages.length % STAGE_COLOR_PALETTE.length]!;
}

export type StagePresetKey = 'bridge' | 'gogo' | 'slowgo' | 'nogo';

export interface StagePreset {
  key: StagePresetKey;
  name: string;
  description: string;
  incomeReplacementRate: number;
}

// Today's fixed stages, offered as starting points rather than the only
// option — picking one seeds a real, fully-editable Stage; picking "Custom"
// (see StageFormModal.vue) starts blank instead.
export const STAGE_PRESETS: StagePreset[] = [
  {
    key: 'bridge',
    name: 'Bridge',
    description:
      "The gap between an account's own withdrawal start age and the rest of the plan, when some accounts may already be drawn on to partially replace income.",
    incomeReplacementRate: 30,
  },
  {
    key: 'gogo',
    name: 'Go-Go Years',
    description:
      "The early stage of retirement when you're healthiest, most active, and typically spending more on travel and lifestyle.",
    incomeReplacementRate: 125,
  },
  {
    key: 'slowgo',
    name: 'Slow-Go Years',
    description:
      'The middle stage of retirement when activity levels naturally decline and spending begins to moderate.',
    incomeReplacementRate: 100,
  },
  {
    key: 'nogo',
    name: 'No-Go Years',
    description:
      'The late stage of retirement marked by reduced mobility, increased rest, and higher healthcare-related expenses.',
    incomeReplacementRate: 75,
  },
];

/** A stage's end age is always derived: the next stage's start, or life expectancy for the last one. */
export function stageEndAge(stages: Stage[], index: number, lifeExpectancy: number): number {
  const next = stages[index + 1];
  return next ? next.startAge : lifeExpectancy;
}

export function findStage(stages: Stage[], stageId: string): Stage | undefined {
  return stages.find((s) => s.id === stageId);
}

/**
 * The user-defined stage covering a given age, or null before the first
 * stage begins (or when there are no stages at all). Assumes `stages` is
 * sorted by startAge. This is a portfolio-wide, age-only lookup — it has no
 * notion of any one account's own withdrawal start age; see
 * useAccountProjection.ts (which additionally gates on that) and
 * PortfolioChart.vue (which uses this alone, since the chart colors every
 * account's bar by which era the age falls in, not by that account's own
 * unlock status).
 */
export function stageForAge(stages: Stage[], age: number): Stage | null {
  let current: Stage | null = null;
  for (const stage of stages) {
    if (stage.startAge > age) break;
    current = stage;
  }
  return current;
}

/**
 * An account's effective withdrawal start age is no longer its own editable
 * field — it's derived from the plan itself: the start age of the earliest
 * stage (stages is assumed sorted by startAge) where this account's own
 * withdrawalShareByAccount is above 0%. Returns Infinity when no stage ever
 * draws on this account, meaning it never withdraws at all.
 */
export function effectiveWithdrawalStartAge(stages: Stage[], accountId: string): number {
  const stage = stages.find((s) => (s.withdrawalShareByAccount[accountId] ?? 0) > 0);
  return stage ? stage.startAge : Infinity;
}
