import { bankActionEligible, ACTION_BANK } from "./actionBank";
import { monthRng } from "./rng";
import type { GameState } from "./types";

const DECK_SIZE = 7;

export function refreshMonthlyDeck(state: GameState): void {
  const rng = monthRng(state, 902);
  const pool = ACTION_BANK.filter((a) => bankActionEligible(state, a));
  const picked: string[] = [];
  const used = new Set(state.monthlyDeck);

  for (let n = 0; n < DECK_SIZE && pool.length > 0; n++) {
    const candidates = pool.filter((a) => !picked.includes(a.key));
    if (!candidates.length) break;
    let total = 0;
    for (const c of candidates) {
      const stale = used.has(c.key) ? 0.35 : 1;
      total += c.weight * stale;
    }
    let roll = rng.next() * total;
    let chosen = candidates[0]!;
    for (const c of candidates) {
      const stale = used.has(c.key) ? 0.35 : 1;
      roll -= c.weight * stale;
      if (roll <= 0) {
        chosen = c;
        break;
      }
    }
    picked.push(chosen.key);
  }

  state.monthlyDeck = picked;
  state.deckMonthIndex = state.calendar.index;
}

export function ensureDeckForMonth(state: GameState): void {
  if (state.deckMonthIndex !== state.calendar.index || state.monthlyDeck.length === 0) {
    refreshMonthlyDeck(state);
  }
}