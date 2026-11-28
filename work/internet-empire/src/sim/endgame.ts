import { END_MONTH_INDEX } from "./eras";
import type { GameState } from "./types";

export function evaluate2030(state: GameState): void {
  if (state.calendar.index < END_MONTH_INDEX) return;
  if (state.flags.ended) return;
  state.flags.ended = true;

  const profitable = state.cash > 0 && state.revenue > state.expenses;
  const leader = state.visitors >= 50_000;
  const bigExit = state.valuation >= 20_000_000;
  const icon = state.brand >= 70 && state.visitors >= 25_000;

  if (profitable || leader || bigExit || icon) {
    state.flags.won = true;
    state.log.push("2030: You survived the AI era with a seat at the table.");
    return;
  }
  state.flags.legacyUrl = true;
  state.flags.gameOver = true;
  state.log.push("2030: Legacy URL — still online, irrelevant.");
}