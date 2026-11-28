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

console.log("internet-empire audit smoke ok");