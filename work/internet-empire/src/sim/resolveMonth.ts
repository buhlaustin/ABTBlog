import { applyQueuedActions } from "./actions";
import { advanceCalendar } from "./calendar";
import { END_MONTH_INDEX, moodForYear } from "./eras";
import { evaluate2030 } from "./endgame";
import { maybeCrisis } from "./crises";
import { fireScriptedEvents, randomHeadline } from "./events";
import { laneDef } from "./lanes";
import { unlockResearchForYear } from "./research";
import { tickRivals } from "./rivals";
import { monthRng } from "./rng";
import type { GameState } from "./types";

function payroll(state: GameState): number {
  const h = state.headcount;
  return (
    h.developers * 4200 +
    h.designers * 3800 +
    h.sales * 4000 +
    h.executives * 9000 +
    400 // founder ramen budget until payroll grows
  );
}

function hostingCost(state: GameState): number {
  return 200 + state.infraTier * 450 + Math.round(state.visitors * 0.02);
}

function organicVisitors(state: GameState, rng: ReturnType<typeof monthRng>): number {
  let base = Math.round(state.brand * 2.5 + state.products.length * 40);
  for (const p of state.products) {
    if (p.stage === "live") base += p.visitorsBoost + p.quality;
  }
  const noise = rng.int(-20, 80);
  return Math.max(0, base + noise);
}

function productTick(state: GameState, revenueMult = 1): void {
  for (const p of state.products) {
    if (p.stage === "building") {
      const boost = state.headcount.developers * 8;
      p.quality += 10 + boost;
      if (p.quality >= 50) {
        p.stage = "live";
        p.revenueMonthly = 400 + p.quality * 12;
        state.log.push(`${p.name} went live.`);
      }
    } else if (p.stage === "live") {
      p.monthsLive += 1;
      state.revenue += Math.round(p.revenueMonthly * revenueMult);
      if (p.kind === "ai") state.computeBurn += 200;
    }
  }
}

function valuationTick(state: GameState): void {
  const multiple = state.macro.mood === "boom" ? 1.12 : state.macro.mood === "bust" ? 0.94 : 1.02;
  const fundamental = state.revenue * 8 + state.visitors * 2 + state.brand * 5000;
  state.valuation = Math.round((state.valuation * 0.6 + fundamental * 0.4) * multiple);
}

function infraStress(state: GameState, rng: ReturnType<typeof monthRng>): void {
  const cap = 500 + state.infraTier * 2500;
  if (state.visitors > cap && rng.chance(0.4)) {
    const drop = rng.int(50, 200);
    state.visitors = Math.max(0, state.visitors - drop);
    state.brand -= 3;
    state.log.push(`Outage! Traffic capped −${drop} visitors.`);
  }
}

export function resolveMonth(state: GameState): GameState {
  if (state.flags.gameOver) return state;

  applyQueuedActions(state);

  const rng = monthRng(state, 1);
  const lane = laneDef(state.lane);
  state.revenue = 0;
  productTick(state, lane.revenueMult);
  const organic = Math.round(organicVisitors(state, rng) * lane.visitorMult);
  state.visitors += organic;

  const adRevenue = Math.round(state.visitors * 0.04 * state.macro.adCpm * lane.revenueMult);
  state.revenue += adRevenue;

  const hosting = Math.round(hostingCost(state) * (1 - lane.hostingDiscount));
  state.expenses = payroll(state) + hosting + state.computeBurn;
  state.cash += state.revenue - state.expenses;

  infraStress(state, rng);

  const rivalLogs = tickRivals(state);
  state.log.push(...rivalLogs.slice(0, 2));

  unlockResearchForYear(state.calendar.year, state.research);

  const scripted = fireScriptedEvents(state);
  state.news.push(...scripted);
  const rnd = randomHeadline(state);
  if (rnd) state.news.push(rnd);
  const crisis = maybeCrisis(state);
  if (crisis) state.news.push(crisis);
  state.news = state.news.slice(-40);

  state.macro.mood = moodForYear(state.calendar.year);
  if (state.macro.mood === "boom") state.macro.adCpm = Math.min(1.6, state.macro.adCpm * 1.01);
  if (state.macro.mood === "bust") state.macro.adCpm = Math.max(0.45, state.macro.adCpm * 0.99);

  valuationTick(state);

  if (state.cash < 0) {
    state.flags.gameOver = true;
    state.log.push("Ran out of cash. The dial-up dream is over.");
  }

  state.history.push({
    monthIndex: state.calendar.index,
    visitors: state.visitors,
    cash: state.cash,
    valuation: state.valuation,
  });

  if (state.calendar.index >= END_MONTH_INDEX) {
    evaluate2030(state);
  } else {
    state.calendar = advanceCalendar(state.calendar);
    state.plannedActions = [];
    state.apLeft = state.apTotal;
  }

  return state;
}