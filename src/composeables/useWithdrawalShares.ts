// A stage's withdrawal shares are how its income-replacement target is split
// among the accounts it draws on. An account is either off (no entry) or on
// (an entry of at least MIN_SHARE), and the entries of every "on" account
// always sum to exactly 100 — there's no such thing as a partly-covered or
// double-covered stage. These helpers are pure so that invariant lives in one
// place: every toggle and slider move produces a new map that already
// satisfies it.

export type ShareMap = Record<string, number>;

/** The smallest share a toggled-on account can hold, in percent. */
export const MIN_SHARE = 1;

/**
 * Turns positive weights into whole-number percentages that sum to exactly
 * 100, keeping their proportions as closely as whole numbers allow (largest
 * remainder method) and never dropping any below MIN_SHARE.
 */
export function distribute(weights: number[]): number[] {
  if (weights.length === 0) return [];

  const total = weights.reduce((sum, w) => sum + w, 0);
  const raw = weights.map((w) => (total > 0 ? (w / total) * 100 : 100 / weights.length));
  const result = raw.map((r) => Math.max(MIN_SHARE, Math.floor(r)));

  let diff = 100 - result.reduce((sum, v) => sum + v, 0);

  // Hand out any shortfall to whichever values lost the most to flooring.
  const byRemainder = raw.map((r, i) => i).sort((a, b) => raw[b]! - Math.floor(raw[b]!) - (raw[a]! - Math.floor(raw[a]!)));
  for (let i = 0; diff > 0; i = (i + 1) % byRemainder.length) {
    result[byRemainder[i]!]! += 1;
    diff -= 1;
  }

  // Raising tiny values up to MIN_SHARE can overshoot; take it back from the largest.
  while (diff < 0) {
    let largest = 0;
    for (let i = 1; i < result.length; i++) if (result[i]! > result[largest]!) largest = i;
    result[largest]! -= 1;
    diff += 1;
  }

  return result;
}

function fromEntries(ids: string[], values: number[]): ShareMap {
  const map: ShareMap = {};
  ids.forEach((id, i) => (map[id] = values[i]!));
  return map;
}

/**
 * Turns an account on. It takes an even 1/n slice of the stage and every
 * account already on gives up proportionally — so the first account gets 100,
 * the second makes it 50/50, and a custom 70/30 becomes roughly 47/20/33.
 */
export function addAccountShare(shares: ShareMap, accountId: string): ShareMap {
  if (accountId in shares) return shares;

  const ids = Object.keys(shares);
  const n = ids.length + 1;
  const weights = [...ids.map((id) => (shares[id]! * (n - 1)) / n), 100 / n];
  return fromEntries([...ids, accountId], distribute(weights));
}

/** Turns an account off; the accounts still on split its slice in proportion to what they had. */
export function removeAccountShare(shares: ShareMap, accountId: string): ShareMap {
  if (!(accountId in shares)) return shares;

  const ids = Object.keys(shares).filter((id) => id !== accountId);
  return fromEntries(ids, distribute(ids.map((id) => shares[id]!)));
}

/**
 * Repairs a map so it satisfies the invariant: drops accounts that no longer
 * exist and anything at or below zero, then rescales what's left to 100. The
 * same map is returned untouched when it's already valid. This is also how
 * saved plans from before shares were toggles (where every account sat at
 * 100% independently) come out as an even-ish split.
 */
export function normalizeShares(shares: ShareMap, validIds: Set<string>): ShareMap {
  const ids = Object.keys(shares).filter((id) => validIds.has(id) && shares[id]! > 0);
  const valid =
    ids.length === Object.keys(shares).length &&
    ids.every((id) => Number.isInteger(shares[id]) && shares[id]! >= MIN_SHARE) &&
    ids.reduce((sum, id) => sum + shares[id]!, 0) === 100;

  // Hand back the very same object whenever nothing needs fixing (including an
  // already-empty map) — callers compare by reference to decide whether to write.
  if (ids.length === 0) return Object.keys(shares).length === 0 ? shares : {};
  return valid ? shares : fromEntries(ids, distribute(ids.map((id) => shares[id]!)));
}
