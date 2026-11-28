---
title: "How to Build a Simulation Game in 2026"
slug: how-to-build-a-simulation-game-in-2026
date: 2026-11-28
description: A from-scratch walkthrough of a browser tick sim—state, resolution, RNG, and UI—ending with a playable twelve-week greenhouse you can run without installing anything.
author: Austin Buhl
tags:
  - games
  - engineering
  - simulation
  - prototyping
playable:
  title: Neighborhood Greenhouse
  entry: /play/greenhouse-tick/index.html
  workHref: /work/greenhouse-tick/
---

Simulation games look like spreadsheets wearing a mood board. Underneath, they are the same engineering pattern over and over: **a world model**, a **discrete tick** that advances time, and **player intent** that nudges the model between ticks. Football Manager, Cities: Skylines, the campaign map in Crusader Kings, and the inbox meters in [Executive Email Roulette](/work/eer/) all share that skeleton.

In 2026 the workflow for building that skeleton has shifted—not because browsers suddenly got magic, but because **the expensive part moved**. Art pipelines and engine licensing used to dominate solo dev calendars; now the bottleneck is **clarity**: naming your state, making ticks predictable, and shipping something a stranger can play from a link. AI assistants help you type faster, but they will happily scatter state across fifteen React hooks unless you give them a contract.

This post walks through a **complete, tiny sim**—**Neighborhood Greenhouse**—the same way I ship larger browser projects like [Startup Simulator](/work/startup-sim/) and [2028: Win the White House](/work/white-house-2028/). We will design the loop, implement the tick, wire a minimal UI, and **play the finished game at the end** (embedded below the article, full screen on [Work](/work/greenhouse-tick/)).

## What counts as a simulation game?

Not every game is a sim. Chess has no hidden continuous variables ticking behind the scenes; Candy Crush is largely puzzle state with juice. A simulation game, for our purposes, has:

1. **Latent variables** the player does not directly set (soil moisture, voter approval, tank pressure).
2. **Coupled feedback** — pushing one lever pulls another (irrigation lowers the reservoir; sun exposure dries soil).
3. **Time steps** — the world updates on **ticks** (days, weeks, turns), not just when the player acts.
4. **Readable failure** — when you lose, you can trace *which* variables left their comfort band.

If your design has those four properties, you are building a sim whether the art is pixelated lettuce or a 4X galaxy.

## 2026 constraints that actually matter

A few realities shape how I prototype sims today:

- **Distribution is solved.** Static HTML + ES modules on a CDN is enough for a demo your cofounder, your Discord, or a classroom can open on a phone. No installer, no store review.
- **Framework tax is optional.** React is great for this blog site; for a self-contained sim I still reach for **modules + one render function** ([I wrote about that toolchain separately](/blog/prototype-to-production-in-the-browser/)).
- **Agents amplify mistakes.** Copilot will generate a beautiful UI with game state split across `useState` calls. Resist unless you enjoy desync bugs. Give agents (and yourself) a **single JSON-serializable state object** and pure `resolveTick(state)` functions.
- **Determinism is a feature.** A small seeded RNG lets you replay weeks, unit-test outcomes, and bisect balance without flakiness.

None of that requires a custom engine. It requires discipline.

## Step 1 — Name the fantasy and the tick

Players need a sentence of fantasy and a sentence of rhythm.

For Greenhouse we pick:

- **Fantasy:** Keep a community greenhouse alive long enough to ship a tomato harvest.
- **Tick:** One **week**. Each week the player spends **action points (AP)** on a short plan, then presses **End week** and the simulation integrates weather, drift, and growth.

That is intentionally boring copy. Boring copy is easy to implement correctly. Save lore for tooltips once the math works.

## Step 2 — Model state as data, not DOM

The fastest way to kill a sim prototype is storing truth in the UI. Meters drawn as progress bars are fine; *the bar width is not the source of truth*.

Greenhouse state is one object:

```javascript
export function createInitialState() {
  return {
    week: 1,
    apLeft: 3,
    queued: [],
    reservoir: 78,
    moisture: 52,
    sun: 62,
    nutrients: 44,
    health: 72,
    growth: 0,
    mold: 6,
    lastWeather: null,
    log: [],
    gameOver: false,
    won: false,
  };
}
```

Everything serializable. You get saves, replays, headless smoke tests, and AI opponents for free because **every actor calls the same resolution functions**.

Keep tuning constants beside content, not buried in logic:

```javascript
export const TUNING = {
  maxWeeks: 12,
  winGrowth: 100,
  ideal: {
    moisture: { lo: 38, hi: 68 },
    sun: { lo: 45, hi: 78 },
    nutrients: { lo: 28, hi: 62 },
  },
};
```

When a playtester says week 6 feels punitive, you change `ideal` or growth coefficients—not hunt through UI code.

## Step 3 — Separate *planning* from *resolution*

Player input in a turn-based sim usually has two phases:

1. **Planning** — queue actions while AP allows; validate constraints (`canQueue`).
2. **Resolution** — apply queued actions, passive drift, random events, win/loss checks (`resolveWeek`).

Greenhouse actions are plain records:

```javascript
export const ACTIONS = {
  water: { label: "Irrigate", moisture: 16, reservoir: -12, ap: 1 },
  shade: { label: "Roll shade cloth", sun: -14, moisture: 4, ap: 1 },
  feed: { label: "Add nutrients", nutrients: 18, health: 2, ap: 1 },
  // ...
};
```

`queueAction` only mutates the plan and spends AP. **No growth happens yet.** That separation prevents the classic bug: half the UI updates on click, half on tick, and testers swear the game "cheats."

Resolution runs in a fixed order:

1. Apply queued player actions.
2. Apply passive drift (soil dries, nutrients deplete, mold creeps).
3. Roll weather and apply it.
4. Compute a **comfort score** from how many variables sit inside `TUNING.ideal` bands.
5. Convert comfort to **growth delta** and secondary health effects.
6. Increment week; evaluate terminal conditions.

That ordering is part of the design. Change it and you change the game.

## Step 4 — Feedback loops beat raw difficulty

Sims feel deep when variables fight each other, not when you divide growth by seven.

Greenhouse coupling examples:

- Irrigation helps moisture but drains the reservoir; mist is weaker but safer when mold is high.
- Opening roof vents raises sun (good for growth) but dries soil faster.
- Mold rises when moisture stays high; high mold shaves health independent of growth.

The player is not solving a single equation. They are **steering a phase space** — keeping three needles near green while a fourth (mold) punishes greed.

Encode comfort as a soft score instead of hard gates:

```javascript
function comfortScore(state) {
  const { ideal } = TUNING;
  let score = 1;
  if (!inBand(state.moisture, ideal.moisture)) score -= 0.22;
  if (!inBand(state.sun, ideal.sun)) score -= 0.22;
  if (!inBand(state.nutrients, ideal.nutrients)) score -= 0.18;
  if (state.mold > 35) score -= 0.2;
  return clamp(score, 0.15, 1.25);
}
```

Soft scoring gives you gradated feedback ("growth +6.2%") instead of opaque fail states. Players learn systems faster when the UI explains *how* the tick interpreted their plan.

## Step 5 — Weather and RNG without chaos

Random events are seasoning, not the meal. Greenhouse weather tables are small, weighted, and applied **after** player intent so plans still matter.

Use a seeded PRNG so headless tests can play entire seasons:

```javascript
export function createRng(seed) {
  let s = seed >>> 0;
  return {
    next() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    },
  };
}
```

`resolveWeek` mixes the run seed with the week index so each week is stable given the same plan, but the sequence does not repeat obviously. That is the same pattern I use in larger sims: **reproducible without feeling predictable**.

In production you might swap LCG for `crypto.getRandomValues` when cryptographic randomness matters; for single-player balance, determinism wins.

## Step 6 — One render function

UI code should read state, not own it. Greenhouse uses a `UIManager.render(state)` that:

- Writes meter labels with `textContent` (not `innerHTML` for numbers).
- Sets CSS custom property `--fill` on progress bars for smooth width transitions.
- Rebuilds the action queue list and event log from arrays.

Use `font-variant-numeric: tabular-nums` on counters so digits do not jitter when values tick. That is a five-second CSS change players subconsciously read as polish.

Micro-interactions matter more than particle systems here: a toast when AP is exhausted, a weather chip updating after resolution, queue rows you can tap to undo before ending the week.

## Step 7 — Prove the loop headlessly

Before you invite anyone to play, script a robot season. The repo smoke test boots modules in Node, queues rotating actions, and calls `resolveWeek` until `gameOver`:

```bash
npm run smoke:greenhouse-tick
```

If growth never moves or the season never terminates, CI fails. That is the sim equivalent of unit tests on your state machine — the same discipline I rely on for [House of Strategy’s phase wiring](/blog/hos-state-machines-and-product-edge-cases/).

## Step 8 — Ship the link

The game lives under `work/greenhouse-tick/` and copies to `/play/greenhouse-tick/` on build—the same path as our other hosted sims. The Next.js site iframes it on `/work/greenhouse-tick/` and, for this post, embeds it below.

Deployment checklist:

- [x] Pure static assets (no server required to play).
- [x] Mobile viewport meta tag and touch-friendly buttons.
- [x] `structuredClone` for cheap state copies when you add undo or AI scouts.
- [x] Event log capped so DOM stays light on long sessions.

## What we deliberately did not build

Scope is a feature. Greenhouse has no map, no multiplayer, no tech tree, no save slots UI. Adding any of those starts with the same state object—we did not skip them because they are hard; we skipped them because **the lesson is the tick**.

When you outgrow the tutorial:

- **Multiple crops** → array of plant structs sharing soil variables.
- **Staff actions** → extra AP sources with salaries in state.
- **Market sim** → price variable updated after harvest resolution.

Each extension should add columns to state, not parallel sources of truth.

## How AI fits without wrecking the architecture

In 2026 I still use agents the same way I use interns: great at boilerplate, dangerous at architecture.

Workflow that works:

1. You write the state schema and resolution order in comments.
2. Agent implements functions *against* that schema.
3. You add a smoke test the agent cannot hand-wave away.
4. You play one full season yourself — agents do not feel mold creep.

For narrative sims ([Startup Simulator’s news feed](/blog/introducing-startup-simulator/), optional AI in HOS), models generate **flavor text** conditioned on state snapshots, not authoritative game logic. The server—or client modules—still decide cash and approval deltas.

## Play it

You have read the wiring. Now run a season.

Queue up to three actions each week, watch weather land after your plan, and push growth to **100%** before week 12 ends without letting **plant health** hit zero. If you over-water, mold spikes; if you chase sun without shade, the beds bake.

The embed below is the same build this article describes—modules, tick order, and tuning constants included in the repo. Prefer full screen? Open [Neighborhood Greenhouse on Work](/work/greenhouse-tick/).

When you beat it (or wipe out gloriously), notice which variables drifted outside the comfort band first. That is the feedback loop talking. The next sim you build—factory floor, clinic scheduler, climate policy toy—starts with the same empty object and the same `resolveTick` function.

Build the loop before the lore. Ship the link before the engine. The greenhouse does not care if you used Unity or vanilla JS; it cares that moisture and sun made sense on week seven.