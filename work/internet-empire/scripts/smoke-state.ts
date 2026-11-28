import { createInitialState, queueAction, resolveMonth } from "../src/sim";

const state = createInitialState({
  mode: "sandbox",
  companyName: "Smoke Co",
  seed: 42,
  sandbox: { startingCash: 120_000, rivalAggression: 0.2 },
});
queueAction(state, "build_website");
queueAction(state, "purchase_domain");

let s = state;
for (let i = 0; i < 36; i++) {
  const snap = structuredClone(s);
  if (!snap.flags.hasWebsite && snap.apLeft >= 1) queueAction(snap, "build_website");
  if (snap.apLeft >= 1 && i % 4 === 2) queueAction(snap, "seo");
  s = resolveMonth(snap);
}

if (!Number.isFinite(s.cash) || !Number.isFinite(s.visitors)) {
  console.error("internet-empire smoke: invalid numbers");
  process.exit(1);
}

if (s.history.length < 12) {
  console.error("internet-empire smoke: expected >=12 months of history", s.history.length);
  process.exit(1);
}

console.log(`internet-empire smoke ok: ${s.history.length} months, cash=${s.cash}, visitors=${s.visitors}`);