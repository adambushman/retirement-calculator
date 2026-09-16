// Canonical identity for every stage an account can be in. Defined once so a
// stage always renders the same color everywhere — the projection chart, the
// stage summary cards, and anywhere else — regardless of whether that stage
// happens to appear in a given account's own data.
// "Accumulation" rather than "Pre-Retirement" because this stage is scoped to
// an *account*, not to the portfolio's working years: an account whose
// withdrawal start age is later than Retirement Age keeps accumulating
// (untouched, at its growth-phase rate) after the paychecks have stopped.
export const STAGE_ACCUMULATION = 'Accumulation' as const;
export const STAGE_BRIDGE = 'Bridge' as const;
export const STAGE_GO_GO = 'Go-Go Years' as const;
export const STAGE_SLOW_GO = 'Slow-Go Years' as const;
export const STAGE_NO_GO = 'No-Go Years' as const;

export const STAGE_NAMES = [
  STAGE_ACCUMULATION,
  STAGE_BRIDGE,
  STAGE_GO_GO,
  STAGE_SLOW_GO,
  STAGE_NO_GO,
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

export const STAGE_COLORS: Record<StageName, string> = {
  [STAGE_ACCUMULATION]: '#f87171',
  [STAGE_BRIDGE]: '#fb923c',
  [STAGE_GO_GO]: '#60a5fa',
  [STAGE_SLOW_GO]: '#5eead4',
  [STAGE_NO_GO]: '#facc15',
};
