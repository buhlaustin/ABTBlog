# Internet Empire — product & technical plan

**Status:** Planning (not yet in Lab)  
**Author:** Austin Buhl  
**Last updated:** 2026-11-28  

## One-liner

Start an internet company in **August 1995**. Ship sites and products month by month, survive the dot-com bubble, outmaneuver giants, and see whether the company still matters when **2030** and the **AI era** arrive.

## Player fantasy

You are not playing spreadsheet CEO—you are building the visible internet. Dial-up becomes broadband becomes mobile becomes cloud. Rivals clone your features. Investors demand "an internet strategy." Somewhere between Netscape and chatbots, you either become infrastructure or become a footnote.

**Winning** is not one ending: dominate a lane, IPO and stay listed, sell at the peak, pivot into a durable platform, or quietly profitable "boring tech" survivor. **Losing** is bankruptcy, ouster, hostile absorption, or **irrelevance** (traffic and revenue decay below survival thresholds while the world moves on).

---

## Locked design decisions

| Topic | Decision |
|-------|----------|
| **Time step** | **Calendar month** (player plans, then **End month**) |
| **Tone** | **Mix** — satirical headlines and rival banter alongside real-era beats (Y2K, bust, mobile, GDPR-ish beats, "AI strategy" theater) |
| **3D layout** | **Side stage** — fixed Three.js viewport beside HTML panels; collapses to static art on small screens / reduced motion |
| **Horizon** | **August 1995 → December 2030** (~424 months career; tutorials and eras gate early complexity) |
| **North-star question** | **Can they survive to the AI era?** — explicit late-game arc, not a post-credits joke |

---

## Core loop

Each **month**:

1. Read **news** (era events, rival moves, macro).
2. Spend **action points** (and optionally **cash**) on the **month plan**: product, growth, hiring, infra, M&A lite, fundraise steps.
3. Resolve **crises** if any fired.
4. **End month** → simulation tick: revenue, burn, traffic, debt/valuation, rival AI, random shocks.
5. **Scene** updates from post-tick state (office tier, server load, mood, era).
6. Autosave.

**Meters (v1 targets):**

- Cash · runway · traffic (abstract MAU/pageviews)
- Revenue & gross margin (simplified)
- Brand · investor confidence
- Tech debt · infra capacity (uptime risk)
- Market share vs. rivals in chosen **lane**

**Modes:**

- **Career** — standard start, modest friends-and-family cash, full 1995–2030 arc.
- **Sandbox** — starting cash, year, rival aggression, optional "start at 2008" for bust recovery fantasy.

---

## Era map (1995–2030)

Eras drive **unlock tables**, **valuation multiples**, **ad CPM / monetization**, **event deck**, and **3D side-stage set**.

| Era | Rough calendar | Fantasy | Mechanical emphasis |
|-----|----------------|---------|---------------------|
| **Garage ISP** | 1995–1996 | HTML, bookmarks, dial-up | Cheap hosting, first property, bandwidth caps |
| **Portal race** | 1997–1998 | Home pages, directories, email | Traffic land grab, portal deals |
| **Bubble build** | 1999–2000 Q1 | "Get big fast", conflicting business models | Burn, hype multiple, talent poaching |
| **Bust & repent** | 2000 Q2–2003 | Layoffs, frugality, gritty survivors | Runway, defaults, ad collapse, B2B pivot |
| **Web 2.0** | 2004–2008 | Social, UGC, platforms | Engagement loops, platform risk |
| **Mobile shift** | 2009–2014 | App stores, phones eat features | Product rewrite pressure, giant bundling |
| **Cloud & scale** | 2015–2019 | SaaS, AWS bill, privacy press | Infra cost curve, trust/scandals |
| **Late platform** | 2020–2023 | Pandemic spike, regulation, fatigue | Remote ops, churn, compliance events |
| **AI era** | 2024–2030 | Copilots, model APIs, "AI wrapper" fear | **Compute cost**, differentiation, giant model bundling |

**Surviving the AI era (2030 gate):**

At **2024-01** the game enables the **AI era** track:

- New product types: assistant, dev tools, vertical copilots, API resale, on-prem "private LLM" enterprise (simplified).
- New costs: **GPU/compute line item** scales with usage; mis-sized infra triggers outages or margin death.
- New risks: **commoditization** (rivals and giants ship the same feature free), **model dependency** (API price shocks), **trust** events (bad output, data leak).
- **2030 December** evaluation: company must meet **at least one** survival criterion (configurable in sandbox):

  - Profitable on a trailing-12-month basis, or
  - Market leader in lane (share ≥ threshold), or
  - Strategic exit (acquisition at ≥ N× revenue), or
  - "Icon" path — brand + traffic still growing into 2030 despite thin margins (hard mode).

Failure state: **"legacy URL"** — still technically up but irrelevant (traffic below floor, no path to AI-era products unlocked).

---

## Systems (greenfield — not Startup Simulator ports)

Build fresh modules; **reuse patterns only** (save versioning, month close, news shape, hosting pipeline).

| System | Scope |
|--------|--------|
| **Calendar** | Month index from 1995-08; era derived from date |
| **Products** | Sites + product lines with lifecycle (prototype → beta → GA → sunset) |
| **Traffic & monetization** | Traffic from growth + product quality; revenue from ads, subs, commerce, enterprise (era-gated) |
| **Infra** | Tiered hosting; capacity vs. traffic → uptime events |
| **People** | Headcount buckets (eng, GTM, ops); burn; hiring lead time |
| **Finance** | Cash, simple cap table, fundraising rounds, IPO lite, debt optional v2 |
| **Rivals** | Seeded competitors per **lane** + giant archetypes (portal, search, commerce, social, cloud, AI) |
| **Events & news** | `data/events.json` + headline templates; mix funny + period-accurate |
| **Crises** | Datacenter, lawsuit, copycat, funding pull, API outage, AI PR disaster |
| **Acquisitions** | Small target roster; no startup-sim depth in v1 |

**Lanes (pick at setup):** content/media, commerce, search/tools, enterprise/B2B, infrastructure/hosting (each skews rival set and win bias).

---

## UI architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Header: company · cash · traffic · month · era chip       │
├──────────────────────────────┬──────────────────────────────┤
│  HTML panels (tabs)          │  Three.js side stage          │
│  Desk · Products · Growth    │  859px max / 40vw desktop    │
│  People · Finance · Rivals   │  era diorama + reactive props │
│  News                        │  collapsible → poster below  │
├──────────────────────────────┴──────────────────────────────┤
│  Month plan queue · End month · flash feedback              │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:** Desk, Products, Growth, People, Finance, Rivals, News.

**Mobile:** Side stage hidden; **era poster** (pre-rendered or simple SVG) + optional "peek 3D" button if GPU allows.

---

## Three.js side stage

### Principles

- Simulation **never** depends on WebGL; canvas is a **view** driven by `SceneDirector` after each tick.
- One diorama per **office tier**; materials/skybox/lighting shift per **era mood** (boom / bust / neutral).
- Target **&lt; 15k triangles** active on mobile preset.

### State → scene API

```text
SceneDirector.apply({
  eraId,
  officeTier,      // 0 garage … 4 campus lite
  serverLoad,      // 0–1 → emissive pulse, fan speed fake
  mood,            // boom | bust | neutral
  rivalPressure,   // 0–1 → billboard / logo wall
  laneId,          // optional desk clutter set
})
SceneDirector.playMoment(id)  // ipo | crash | launch | ai_spotlight
```

### Moments (scripted anims, &lt; 5s)

- Product launch (screen flash + particle puff)
- IPO (ticker scroll mesh, camera nudge)
- Dot-com crash week (staggered lights off, red key light)
- First AI product ship (spotlight on "GPU rack" prop, 2024+)

### Accessibility & performance

- `prefers-reduced-motion`: static poster image per era/tier (exported from Blender once).
- Tab hidden: pause RAF.
- `deviceMemory` / narrow width: low preset, 30 FPS cap.

### Build integration

- Add `three` to repo `dependencies`.
- `work/internet-empire/vite.config.js` builds `scene-bundle.js` (game imports bundled Three + loaders).
- `npm run build:internet-empire` in `prebuild` after copy or as part of copy script.
- Playwright / smoke: **no WebGL** — stub `SceneDirector`.

---

## Art plan (non-designer friendly)

**Goal:** Cohesive **low-poly / stylized** diorama without custom modeling as a blocker.

### Strategy (hybrid)

1. **Base kits (free license)** — assemble garage → office → server room from CC0 / CC-BY packs; retexture in one palette.
2. **Custom minimal** — only what kits lack: era sign boards, company name plane, stock ticker primitive, GPU rack silhouette for AI era.
3. **Poster fallbacks** — one 2D image per `era × officeTier` for reduced motion and mobile.

### Source candidates (verify license per asset before ship)

| Source | Use |
|--------|-----|
| [Kenney](https://kenney.nl/assets) (CC0) | Furniture, simple buildings, UI bits |
| [Poly Pizza](https://poly.pizza) | Search "office", "computer", "server"; filter CC0 |
| [Quaternius](https://quaternius.com) | Low-poly props packs |
| [Sketchfab](https://sketchfab.com) | Filter: downloadable + CC0; office/tech |
| **Blender** (you or agent) | Merge kits, palette, export **glTF binary** `.glb` |

**Single art direction sheet (agent-maintained):**

- Palette: warm beige 1995 → cool glass 1999 → desaturated 2002 → flat color Web 2.0 → minimal 2015+ → neon accent strip 2024+ (AI rack only).
- No realistic logos; **fictional** rival names and generic screens.
- Company name: **dynamic texture** on one sign mesh (canvas → `CanvasTexture`).

### Deliverables by phase

| Phase | Art |
|-------|-----|
| P1 | Garage kit + PC + one desk → `garage_v1.glb` |
| P2 | Server rack instances + bubble office props |
| P3 | Bust variant (boxes, dark lighting preset) |
| P4 | 2024 GPU shelf prop + AI spotlight moment |
| P5 | Poster set export for a11y |

**Attribution:** `work/internet-empire/assets/CREDITS.md` — per-model author, license, URL.

---

## Content & tone (mix)

- **Headlines:** 60% wry/satirical (in the spirit of Startup Sim press), 40% grounded era markers players recognize.
- **Rivals:** Named archetypes (`GiantSearch`, `BookStore`, `SocialGraph`) — punchy dialogue, not real trademarks.
- **Events:** JSON-driven with `severity`, `era`, `effects`, optional `headline` / `body`.
- **AI era copy:** Self-aware but not pure parody — capture real tensions (margin, dependency, safety theater).

Optional later: shared narrative Lambda pattern (HOS/EER); **v1 is local JSON only**.

---

## Repository layout (target)

```text
work/internet-empire/
  PLAN.md                 ← this file
  README.md               ← play instructions when live
  index.html
  style.css
  game.js
  vite.config.js
  modules/
    GameState.js
    Calendar.js
    Simulation.js
    Rivals.js
    Products.js
    Finance.js
    Events.js
    News.js
    SceneDirector.js
    Storage.js
    UI.js
    three/
      SceneRuntime.js
  data/
    eras.json
    products.json
    events.json
    rivals.json
    headlines.json
    lanes.json
  assets/
    manifest.json
    models/
    textures/
    posters/
    CREDITS.md
  scripts/
    smoke-state.mjs       ← headless month tick
```

**Site wiring (when implementation starts):**

- `scripts/copy-work-assets.mjs` — add `internet-empire`
- `src/lib/work-registry.ts` — Lab card
- `src/app/work/internet-empire/page.tsx` — hosted iframe
- `package.json` — `build:internet-empire`, `smoke:internet-empire`, hook in `prebuild`

---

## Implementation phases

### Phase 0 — Scaffold

Menu, setup (name, lane, city flavor), month 0→1 tick, meters, save/load, smoke test, copy-work + registry (`status: wip`).

### Phase 1 — Side stage v1

Vite bundle, garage `.glb`, `SceneDirector` wired to `officeTier` + era; reduced-motion poster.

### Phase 2 — 1995–2000

Products, traffic, burn, first fundraise, three rivals, era events through bust trigger.

### Phase 3 — Bubble & bust

Multiples, IPO path, crash chain, bust scene + gameplay.

### Phase 4 — 2004–2019

Web 2.0 / mobile / cloud unlocks, rewrite crises, compliance beat optional.

### Phase 5 — AI era (2024–2030)

Compute economics, AI product line, giant bundling, **2030 survival evaluation**, endgame screen + hall of fame.

### Phase 6 — Polish

More props, SFX, tutorial, balance pass, promote Lab card to `live`.

---

## Testing

- **smoke-state.mjs:** create game → queue 1 action → end month → assert cash/traffic finite, no throw; run 12 months seeded.
- **No WebGL in CI.**
- Optional Playwright: load menu, start game, tab navigation (later).

---

## Open questions (non-blocking)

- Exact AP per month (start with **3**, tune).
- Whether IPO is interactive mini-game or event chain (start **chain**).
- Multiplayer / leaderboards (defer).

---

## Success criteria for "plan complete"

- [x] Decisions recorded (month, mix tone, side stage, art approach, 2030 + AI).
- [ ] Phase 0 branch started
- [ ] First `.glb` in repo with `CREDITS.md`
- [ ] Playable at `/work/internet-empire/` (wip)

---

## Related Lab games

| Game | Relationship |
|------|----------------|
| **Startup Simulator** | Spiritual cousin (tycoon); **do not** share task/cap-table corpora |
| **Executive Email Roulette** | Tone reference for satire |
| **2028: Win the White House** | Era/rng/week structure reference |
| **Neighborhood Greenhouse** | Tick discipline reference |

---

*Next implementation step: Phase 0 scaffold + Kenney/Quaternius-sourced `garage_v1.glb` and side-stage shell.*