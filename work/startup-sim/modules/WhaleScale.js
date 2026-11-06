/** Desk / growth plays at institutional scale (multi-billion book bands). */
export const MEGAWHALE_REVENUE_MIN = 2_000_000_000;

export function isMegawhalePlay(def) {
  if (!def) return false;
  if (def.megawhale === true) return true;
  return (def.revenue?.[1] ?? 0) >= MEGAWHALE_REVENUE_MIN;
}
