import { createInitialState, queueAction, resolveMonth } from "../src/sim";
import { END_MONTH_INDEX } from "../src/sim/eras";

/** Fast sandbox: assert 2030 evaluation runs without throwing. */
const state = createInitialState({
  mode: "sandbox",
  companyName: "2030 Test Co",
  seed: 99,
  sandbox: { startingCash: 2_000_000, startYear: 2028, rivalAggression: 0.1 },
});

let s = state;
const months = END_MONTH_INDEX - s.calendar.index + 1;
for (let i = 0; i < months; i++) {
  const snap = structuredClone(s);
  if (snap.apLeft >= 2 && !snap.flags.hasWebsite) queueAction(snap, "build_website");
  if (snap.apLeft >= 1 && i % 4 === 0) queueAction(snap, "ai_product");
  if (snap.apLeft >= 1 && i % 5 === 1) queueAction(snap, "research_tick");
  s = resolveMonth(snap);
}

if (!s.flags.ended) {
  console.error("2030 smoke: expected ended flag", s.calendar);
  process.exit(1);
}

console.log(
  `2030 smoke ok: won=${s.flags.won} legacy=${s.flags.legacyUrl} visitors=${s.visitors}`
);