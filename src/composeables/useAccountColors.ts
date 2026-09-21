// Each account gets one color for life, used wherever the app needs to tell
// accounts apart at a glance (today, the stage card's toggles and the
// matching segments of its share slider). Darker, more saturated hues than
// the stage palette so an account's color never reads as a stage's.
export const ACCOUNT_COLOR_PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#06b6d4',
  '#8b5cf6', '#ef4444', '#84cc16', '#14b8a6',
];

/** The first palette color no other account is using, cycling once every color is taken. */
export function nextAccountColor(usedColors: Array<string | undefined>): string {
  const used = new Set(usedColors);
  const unused = ACCOUNT_COLOR_PALETTE.find((c) => !used.has(c));
  return unused ?? ACCOUNT_COLOR_PALETTE[usedColors.length % ACCOUNT_COLOR_PALETTE.length]!;
}
