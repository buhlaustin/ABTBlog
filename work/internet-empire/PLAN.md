# Internet Empire — product & technical plan

**Status:** Planning (not yet in Lab)  
**Author:** Austin Buhl  
**Last updated:** 2026-11-28  

---

## INTERNET EMPIRE

**Build the internet. One startup at a time.**

Start in **1995** with a computer, a dial-up connection, and an idea. Build your way from a tiny garage startup to a global technology empire — and find out if you still matter when the **AI era** hits and the calendar reaches **2030**.

**North-star question:** Can you survive to the AI era?

---

## Locked design decisions

| Topic | Decision |
|-------|----------|
| **Time step** | **Calendar month** — plan actions, then **End month** |
| **Tone** | **Mix** — satirical headlines and rival banter plus recognizable historical beats (dot-com crash, mobile wave, platform wars, “AI strategy” theater) |
| **Horizon** | **January 1995 → December 2030** (Career); Sandbox can start later years |
| **Primary UI idea** | **Interface evolves with the timeline** — 1995 feels like Windows 95; mid-2000s like the early web; late 2020s like a modern enterprise dashboard |
| **Persistence** | **Local cache** (autosave) like Startup Simulator; **no LLM / AI dependency** in gameplay |
| **Simulation** | **Deterministic**, pure TypeScript engine (seeded RNG); unit- and smoke-testable |
| **Modes** | **Career** + **Sandbox** |

| Topic | Secondary (retained) |
|-------|----------------------|
| **3D** | Optional **Three.js side stage** beside the main UI — era diorama, not required for sim; complements UI evolution |
| **Art** | Free/CC0 low-poly kits + minimal custom props; no designer bottleneck |

---

## 1. Core gameplay

You start with practically nothing.

### Your startup — Year 1 (January 1995)

| Stat | Value |
|------|-------|
| **Cash** | $5,000 |
| **Employees** | 1 (you) |
| **Website visitors** | 0 |
| **Valuation** | $5,000 |

### Month loop

1. **News & macro** — era events, rival moves, economy shifts.
2. **Choose actions** — spend monthly **action points** (and cash where required).
3. **Crises** — optional interrupts (outages, lawsuits, copycats).
4. **End month** — deterministic sim tick: traffic, revenue, burn, rivals, valuation.
5. **UI skin** — chrome updates automatically from calendar era (see §4).
6. **Autosave** to local storage.

### Starter actions (Year 1 unlocks)

These are the first verbs the player sees; more systems open per era and research.

- **Build your first website**
- **Purchase a domain**
- **Invest in advertising**
- **Hire your first employee**
- **Develop your first product**

Later months add fundraising, infra upgrades, partnerships, research nodes, acquisitions, IPO steps, and AI-era product types.

### Win / lose

- **Win paths:** Lane dominance, durable profitability, successful IPO that stays listed, strategic exit, or “icon” survival into 2030 (hard).
- **Lose paths:** Bankruptcy, founder ouster, hostile acquisition on bad terms, or **legacy URL** (site still up, business irrelevant).

### Career vs. Sandbox

| Mode | Notes |
|------|--------|
| **Career** | Fixed start Jan 1995, $5k, standard rival seed, full timeline to Dec 2030 |
| **Sandbox** | Tune starting cash, start year, rival aggression, optional skip-ahead for testing eras / UI skins |

---

## 2. Historical progression

Eras drive **unlock tables**, **economy modifiers**, **event deck**, **research tree**, **rival behavior**, and **UI theme**.

| Era | Years | Opportunities |
|-----|-------|----------------|
| **Early Internet** | 1995–1999 | Websites, portals, directories |
| **Dot-com boom** | 2000–2004 | E-commerce, hosting, search |
| **Web 2.0** | 2005–2009 | Social media, video, SaaS |
| **Mobile revolution** | 2010–2015 | Apps, subscriptions, cloud |
| **Platform economy** | 2016–2022 | Marketplaces, streaming, fintech |
| **AI era** | 2023–2030 | Automation, AI products, agents |

### Historical events (economy + gameplay)

Real-history-shaped **events** are not cosmetic: they move macros the sim reads.

| Event class | Examples | Effect style |
|-------------|----------|--------------|
| **Busts / crises** | Dot-com crash (~2000–2002), 2008 financial crisis, COVID demand spike, rate-hike winters | Valuation multiples, ad CPMs, funding availability, default risk |
| **Adoption waves** | Broadband, mobile, app stores, cloud migration | Unlocks channels; punishes desktop-only products |
| **Breakthroughs** | Search quality leaps, social graph, smartphones, transformer moment | New product categories; research nodes; giant behavior shifts |
| **Regulation / trust** | Privacy eras, platform hearings (fictionalized) | Compliance cost, brand shocks |

Events are data-driven (`events.json`): `era`, `date window`, `probability`, `effects` on globals and/or player flags, `headline` + `body` (mixed tone).

### AI era (2023–2030)

- **New products:** assistants, dev tools, vertical copilots, API resale, enterprise “private stack” (simplified).
- **New costs:** **compute/GPU** line item tied to usage and infra tier.
- **New threats:** Commoditization, API price shocks, trust incidents, giants bundling models for free.
- **2030 gate:** At **December 2030**, evaluate survival criteria (profit, share leader, exit, or icon path). Fail → **legacy URL** ending.

---

## 3. Business mechanics

Interconnected systems; all implemented in the **sim engine** (no UI logic in resolution).

### Development

- Product lines and **website** properties (lifecycle: concept → build → launch → iterate → sunset).
- **Infrastructure** tiers (hosting, bandwidth, uptime vs. traffic).
- **Features** as attachable upgrades (search, accounts, payments, API, mobile parity, etc.) gated by era + research.

### Marketing

- **SEO** (slow compounding), **advertising** (paid bursts), **partnerships** (portals, bundles), **brand** (reduces churn, helps fundraising).
- Channel availability changes by era (banner ads → AdWords-like → social ads → programmatic).

### Finance

- **Revenue** (ads, subs, commerce take rate, enterprise contracts).
- **Expenses** (payroll, hosting, marketing, compute in AI era).
- **Funding rounds**, convertible notes (lite), **IPO** event chain, secondary / insider scenarios (later).
- **Valuation** tracks fundamentals + hype multiple (era-sensitive).

### Human resources

- Roles: **developers**, **designers**, **sales**, **executives** (simplified buckets or named hires v2).
- Hiring lead time, salary inflation by era and bubble phase, morale optional v2.

### Competition

- **Rival companies** (seeded) launch products, steal share, trigger price wars, attempt acqui-hires.
- **Giants** archetypes per era (portal, search, social, cloud, AI) — pressure without using real trademarks.

### Research

- Tech tree unlocks **categories** (e.g. recommendation, mobile SDK, payments rail, ML training).
- Research consumes AP/months and cash; gates acquisitions and premium products.

### Acquisitions

- Buy smaller competitors for talent/traffic/tech; **sell** company or divisions as exit path.
- Simplified diligence minigame (price vs. synergy vs. integration risk).

### Core HUD stats (always visible)

**Cash · Employees · Website visitors · Valuation** — plus era-appropriate secondary stats (MRR, MAU, compute burn) as they unlock.

---

## 4. Interface — timeline evolution (signature feature)

The **same game state** renders through **era-specific UI chrome**. This is intentional product design, not a reskin Easter egg.

### Era themes (target feel)

| Era | UI direction | Notes |
|-----|----------------|-------|
| **1995–1999** | **Windows 95** — gray bevels, Start-bar metaphor, system font, modal dialogs | “My Computer”, dial-up status, low-color desktop |
| **2000–2004** | **Dot-com web** — gradients, rounded rects, bubbly buttons, early CSS aesthetic | Bubble optimism → bust muted palette sub-mode |
| **2005–2009** | **Web 2.0** — glossy headers, tabs, feeds, rounded cards, “beta” badges | Social/productivity app vibes |
| **2010–2015** | **Mobile-first influence** — flat-ish, big touch targets, app drawer nav | Still desktop game; phone-shaped widgets optional |
| **2016–2022** | **Platform SaaS** — sidebar + dense data, neutrals, component library look | Marketplace/streaming dashboards |
| **2023–2030** | **Modern enterprise** — dark/light pro theme, dense metrics, Recharts, command palette | AI ops panels, compute cost widgets |

### Implementation approach

- **`UIEraProvider`** — derives `uiEra` from in-game date (with optional `mood`: `boom` | `bust` | `neutral`).
- **Token sets per era** — Tailwind CSS variables or era-specific class maps (`data-ui-era="win95"`).
- **Component variants** — one React component API; `Button`, `Panel`, `StatCard`, `Nav` swap structure/styles by era.
- **Progressive disclosure** — 1995 shows fewer tabs; enterprise era shows full finance/research/rival analytics.
- **Accessibility** — “Use simplified UI” toggle forces **modern accessible** chrome while keeping sim rules; `prefers-reduced-motion` disables skeuomorphic animations.

### Layout (enterprise era baseline; other eras adapt)

```
┌────────────────────────────────────────────────────────────┐
│  [Era chrome header]  Company · Jan 1995 · End month      │
├──────────┬─────────────────────────────────────────────────┤
│  Nav     │  Main: actions · products · charts               │
│  (era)   │  Stats: Cash · Employees · Visitors · Valuation   │
├──────────┴─────────────────────────────────────────────────┤
│  News ticker / event banner (era-styled)                   │
└────────────────────────────────────────────────────────────┘

Optional right rail (wide screens): Three.js side stage / office vignette
```

### Three.js side stage (optional complement)

- Not the primary interface story; **UI evolution carries the fantasy**.
- Side canvas: low-poly office/garage reacting to `officeTier`, `serverLoad`, macro **mood**.
- Free/CC0 `.glb` kits; sim never depends on WebGL (stub in tests).

---

## 5. How we build it

### Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TypeScript |
| **Styling** | Tailwind CSS (era tokens + variants) |
| **Client state** | Zustand (UI + mirrored sim snapshot); sim source of truth in engine module |
| **Charts** | Recharts (unlock in later eras; simple bars in early web era) |
| **Simulation** | Custom **TypeScript** engine (`packages/sim` or `src/sim`) — pure functions, seeded RNG |
| **Backend** | Supabase |
| **Database** | PostgreSQL (via Supabase) |

### What runs where

| Concern | v1 | Later |
|---------|----|-------|
| **Gameplay save** | `localStorage` autosave (Startup Sim pattern): `SAVE_VERSION`, `normalizeSave()` | Optional cloud sync |
| **Supabase** | Auth-off or anonymous; schema ready | Cloud saves, hall of fame, seasonal leaderboards |
| **AI / LLM** | **None** | Still none unless explicitly scoped later |

**Principle:** No unnecessary complexity. The game must be fun offline in the browser with **local cache only**.

### Deterministic simulation

```text
state₀ = createInitialState({ seed, mode, options })
stateₙ₊₁ = resolveMonth(stateₙ, playerPlan, rng(seed, month))
```

- All randomness through **seeded PRNG** (testable).
- `resolveMonth` is pure: no `fetch`, no `Date.now()` inside tick.
- Vitest (or node smoke) runs N months from fixed seeds; golden snapshots for balance regressions.

### Zustand vs. engine

- **Engine** holds canonical `GameState` (serializable JSON).
- **Zustand** exposes UI-friendly slice + dispatches intents (`queueAction`, `endMonth`).
- After each tick, persist entire state to local storage.

### Monorepo integration (ABTBlog)

Internet Empire is **not** a vanilla ESM tile like older Lab games. Target layout:

```text
work/internet-empire/
  PLAN.md
  README.md
  package.json          # workspace or nested package
  vite.config.ts        # React SPA build
  src/
    app/                # routes: menu, setup, game shell
    components/         # era variants
    themes/             # win95, dotcom, web2, mobile, platform, enterprise
    store/              # zustand
    sim/                # engine (importable from Node for tests)
    three/              # optional SceneDirector
  public/
  supabase/
    migrations/         # when cloud features ship
```

**Deploy:** Vite build output → `public/play/internet-empire/` via `copy-work-assets` (or `npm run build:internet-empire` in `prebuild`).

**Site:** `src/lib/work-registry.ts` + `src/app/work/internet-empire/page.tsx` (iframe or direct embed).

### Supabase (planned, not blocking v1)

| Table | Purpose |
|-------|---------|
| `profiles` | Optional user id |
| `saves` | Cloud backup of serialized state + metadata |
| `hall_of_fame` | Endgame scoreboard entries |

Row Level Security on `saves` / `hall_of_fame`; gameplay never requires network.

---

## Content & tone

- **Headlines:** ~60% wry, ~40% period-accurate.
- **Rivals:** Fictional names (archetypes, not trademarks).
- **Events:** JSON-first; no generated prose dependency.

---

## Art plan (non-designer friendly)

1. **UI era chrome** — CSS/Tailwind + optional pixel/system fonts (respect licensing); primary visual investment.
2. **3D kits** — Kenney, Quaternius, Poly Pizza (CC0); `assets/CREDITS.md`.
3. **Posters** — static fallbacks for reduced motion / no WebGL.

---

## Repository & tooling

| Script | Purpose |
|--------|---------|
| `build:internet-empire` | Vite production build |
| `smoke:internet-empire` | Headless 12-month sim from seed |
| `test:internet-empire` | Vitest for `resolveMonth` |

---

## Implementation phases

### Phase 0 — Scaffold

React app shell, Career/Sandbox menu, Jan 1995 start stats, one month tick, **Win95 UI skin**, local save, smoke test, Lab entry `wip`.

### Phase 1 — Core verbs

Starter five actions, visitors/revenue basics, End month, stat HUD.

### Phase 2 — Eras 1995–2004

Full early + dot-com tables, historical events (crash), **dot-com UI skin** + bust sub-mode.

### Phase 3 — Web 2.0 & mobile UI skins

Research tree v1, rivals, **Web 2.0** then **mobile-influenced** chrome.

### Phase 4 — Platform economy (2016–2022)

Marketplace/streaming/fintech products, **SaaS dashboard** skin, Recharts-heavy finance tab.

### Phase 5 — AI era through 2030

Compute economics, AI products, **enterprise dashboard** skin, 2030 ending evaluation.

### Phase 6 — Polish

Three.js side stage, SFX, tutorial, balance, Supabase hall of fame (optional), promote to `live`.

---

## Testing

- **Unit:** `resolveMonth`, economy formulas, event triggers, research gates (fixed seeds).
- **Smoke:** 12+ months, no NaN, save round-trip.
- **E2E (optional):** Playwright — start Career, end month, UI era attribute matches date.
- **CI:** No WebGL required; Three.js stubbed.

---

## Open questions

- Action points per month (default **3**).
- Exact giant roster size at launch (default **3 rivals + 2 giants** pressure schedule).
- Whether Supabase ships in v1 or Phase 6 only (**default: Phase 6**; local-only until then).

---

## Success criteria

- [x] Product vision and stack recorded in this doc.
- [ ] Phase 0 playable with Win95 chrome and local save.
- [ ] UI era transitions through at least **three** themes before 2030 content complete.
- [ ] Deterministic smoke in `prebuild`.
- [ ] Listed on Lab (`/work/internet-empire/`).

---

## Related Lab games

| Game | Relationship |
|------|----------------|
| **Startup Simulator** | Cousin tycoon; **do not** port task/cap-table data; **do** mirror save ergonomics |
| **Executive Email Roulette** | Satire tone reference |
| **2028: Win the White House** | Event + rival tick reference |
| **Neighborhood Greenhouse** | Deterministic tick discipline reference |

---

*Next step: Phase 0 — Vite + React + TS + Tailwind + Zustand scaffold, sim package with Jan 1995 initial state ($5k, 1 employee, 0 visitors), Win95-themed game shell, `localStorage` save.*