import { calendarFromIndex, createInitialState, queueAction, resolveMonth } from "../src/sim";

function fail(msg: string): never {
  console.error(`internet-empire audit smoke: ${msg}`);
  process.exit(1);
}

// Dot-com crash mood should stick through the rest of 2000 (no year-boundary overwrite same year).
{
  const s = createInitialState({
    mode: "sandbox",
    companyName: "Audit Co",
    seed: 7,
    sandbox: { startingCash: 200_000, startYear: 2000 },
  });
  s.calendar = calendarFromIndex(63);
  s.macro.mood = "boom";
  s.cash = 250_000;
  resolveMonth(s);
  if (s.macro.mood !== "bust") fail(`expected bust after Apr 2000 crash, got ${s.macro.mood}`);
  const may = structuredClone(s);
  resolveMonth(may);
  if (may.macro.mood !== "bust") fail(`expected bust held into May 2000, got ${may.macro.mood}`);
}

// Bankruptcy should not advance the calendar.
{
  const broke = createInitialState({
    mode: "sandbox",
    companyName: "Broke Co",
    seed: 1,
    sandbox: { startingCash: 500, startYear: 2005 },
  });
  const idx = broke.calendar.index;
  broke.cash = -1;
  resolveMonth(broke);
  if (!broke.flags.gameOver) fail("expected gameOver when cash negative");
  if (broke.calendar.index !== idx) fail("calendar advanced after bankruptcy");
}

// Compute burn should be derived from live AI products, not runaway += each month.
{
  const ai = createInitialState({
    mode: "sandbox",
    companyName: "GPU Co",
    seed: 2,
    sandbox: { startingCash: 500_000, startYear: 2024 },
  });
  queueAction(ai, "ai_product");
  let cur = ai;
  for (let i = 0; i < 24; i++) {
    cur = resolveMonth(structuredClone(cur));
    if (cur.computeBurn > 12_000) fail(`computeBurn runaway: ${cur.computeBurn} at month ${i}`);
  }
  if (cur.computeBurn < 2000) fail(`expected meaningful compute burn with AI live, got ${cur.computeBurn}`);
}

// Queued action costs are honored at resolve (two infra upgrades at tier 0 → $800 + $800).
{
  const mk = () =>
    createInitialState({
      mode: "sandbox",
      companyName: "Infra Co",
      seed: 3,
      sandbox: { startingCash: 200_000, startYear: 2005 },
    });
  const two = mk();
  queueAction(two, "upgrade_infra");
  queueAction(two, "upgrade_infra");
  const one = mk();
  queueAction(one, "upgrade_infra");
  resolveMonth(two);
  resolveMonth(one);
  if (two.infraTier !== 2) fail(`expected infra tier 2, got ${two.infraTier}`);
  if (one.infraTier !== 1) fail(`expected infra tier 1, got ${one.infraTier}`);
  const hostingDelta = 450;
  const actionDelta = 800;
  const cashDiff = one.cash - two.cash;
  if (cashDiff !== actionDelta + hostingDelta) {
    fail(`expected $${actionDelta + hostingDelta} cash gap from double upgrade, got ${cashDiff}`);
  }
}

// Covid visitor spike applies before ad revenue in the same month.
{
  const s = createInitialState({
    mode: "sandbox",
    companyName: "Remote Co",
    seed: 4,
    sandbox: { startingCash: 100_000, startYear: 2020 },
  });
  s.calendar = calendarFromIndex(302);
  s.visitors = 10_000;
  s.flags.hasWebsite = true;
  const snap = structuredClone(s);
  resolveMonth(snap);
  const noEvent = structuredClone(s);
  noEvent.firedEvents = ["covid-spike"];
  resolveMonth(noEvent);
  if (snap.revenue <= noEvent.revenue) {
    fail(`covid month revenue should beat non-event month (${snap.revenue} vs ${noEvent.revenue})`);
  }
}

// Monthly opportunity deck is populated.
{
  const s = createInitialState({
    mode: "sandbox",
    companyName: "Deck Co",
    seed: 11,
    sandbox: { startingCash: 100_000, startYear: 2005 },
  });
  if (s.monthlyDeck.length < 7) fail(`expected monthly deck, got ${s.monthlyDeck.length}`);
}

// Mid-game revenue should scale past early MRR caps.
{
  const s = createInitialState({
    mode: "sandbox",
    companyName: "Scale Co",
    seed: 12,
    sandbox: { startingCash: 800_000, startYear: 2008 },
  });
  s.flags.hasWebsite = true;
  s.products.push({
    id: "p1",
    name: "Scale Pro",
    kind: "product",
    stage: "live",
    quality: 65,
    visitorsBoost: 200,
    revenueMonthly: 8000,
    monthsLive: 12,
  });
  s.headcount.sales = 3;
  s.monetization.productRevenueMult = 1.2;
  resolveMonth(s);
  if (s.revenue < 25_000) fail(`expected scaled monthly revenue, got ${s.revenue}`);
}

console.log("internet-empire audit smoke ok");