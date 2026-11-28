/**
 * Headless smoke: queue a week and finish a full season via auto-actions.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const game = join(root, "work/greenhouse-tick");

const { createInitialState, resetWeekPlan } = await import(
  `file://${join(game, "modules/GameState.js")}`
);
const { queueAction, resolveWeek } = await import(
  `file://${join(game, "modules/Simulation.js")}`
);
const { TUNING } = await import(`file://${join(game, "modules/Data.js")}`);

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const state = createInitialState();
const seed = 42;
const rotation = ["water", "feed", "shade", "openRoof", "compost", "scout"];

for (let i = 0; i < TUNING.maxWeeks + 2; i++) {
  if (state.gameOver) break;
  const id = rotation[i % rotation.length];
  queueAction(state, id);
  resolveWeek(state, seed);
  if (!state.gameOver) resetWeekPlan(state);
}

if (!state.gameOver) fail("season did not reach a terminal state");
if (state.growth <= 0) fail("growth never moved");

console.log(
  state.won
    ? `OK: won with growth=${state.growth.toFixed(1)} health=${state.health}`
    : `OK: ended growth=${state.growth.toFixed(1)} health=${state.health}`
);
process.exit(failed ? 1 : 0);