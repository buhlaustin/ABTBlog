# Startup Simulator — Game Design & Engineering Plan

> **Internal planning document.** Not linked from the public site, RSS, or sitemap. Source of truth for implementation phases until the game ships.

## Working title & slug

- **Title:** Startup Simulator (working name; can rebrand later)
- **Repo path:** `work/startup-sim/`
- **Site route:** `/work/startup-sim/` → iframe `/play/startup-sim/index.html`
- **Stack:** Vanilla JS (ES modules), HTML, CSS — same pattern as HOS and EER

---

## Vision

A single-player startup tycoon with a **12-month calendar loop**, **revenue-driven progression**, **fundraising & cap table**, **staff as spreadsheet inventory**, **AI-generated news & social feeds**, and a **context-aware chief-of-staff chatbot**. Tone: aspirational but grounded; satire optional in news/social, not in core finance math.

**Win condition:** Reach **$1B cumulative revenue** to unlock IPO; optionally continue post-IPO to grow stock price or **cash out** (CEO steps down, final payout = shares × price).

**Modes:**

| Mode | Starting cash | Difficulty | Story |
|------|---------------|------------|--------|
| **Career** | $120,000 | Standard costs, market friction, event severity | Full narrative beats |
| **Sandbox** | $500,000 default; dropdown up to **$1B** | Lower friction (cheaper research, milder penalties) | Same story beats and revenue gates |

**Important:** Sandbox starting cash does **not** count toward **revenue earned** milestones. Both modes track `lifetimeRevenue` from $0.

---

## Player journey (progression gates)

All gates use **lifetime revenue earned** (not cash on hand, not funding).

```mermaid
flowchart TD
  Start[Start screen: load / new game] --> Setup[Name + category + mode]
  Setup --> Garage[Stage: Garage]
  Garage -->|"lifetimeRevenue >= 50k"| Office[Stage: Small office]
  Office -->|"lifetimeRevenue >= 500k"| XC[Unlock X Combinator]
  XC --> Interview[XC application / interview beat]
  Interview -->|Accepted| SF[3 months SF residency + 500k SAFE]
  SF --> City[Choose hub office: SF Bay / Atlanta / NYC / Miami / Dallas]
  City --> Raise[Finalize first priced round]
  Raise --> Scale[Multi-office expansion + headcount]
  Scale -->|"lifetimeRevenue >= 1B"| IPO[IPO unlocked]
  IPO --> Post[Post-IPO: stock sim + optional further raises]
  Post --> Exit[Cash out / step down ending]
```

### Stage: Garage

- Visual: small garage (CC0 / Commons art — see Assets)
- **Monthly action budget:** 4 counted tasks (see Calendar)
- **Staff:** Solo founder; after revenue/hiring unlock, max **2 remote** employees until office stage
- Activities: research product, develop MVP/features, marketing, sales/support tasks tuned to category (SaaS, marketplace, consumer app, etc.)

### Stage: Small office ($50k revenue)

- Better research tree depth, more marketing channels, higher revenue multipliers
- **Monthly tasks:** 5–6
- In-person + remote hiring opens; department budgets become relevant

### Stage: X Combinator ($500k revenue)

- Fictional **X Combinator (XC)** — YC-like accelerator, not using YC trademarks in UI copy where avoidable
- Relocate to SF for **3 in-game months** (calendar continues; tasks may be XC-themed)
- **Application:** mix of deterministic checks + optional **AI interview** (later phase)
- On acceptance: **+$500,000** funding (instrument: SAFE or convertible — cap table impact defined in Finance)
- Unlocks **fundraising flow** (term sheet, valuation, dilution)

### Stage: Post-XC hub + raise

- Player picks permanent hub: **Bay Area, Atlanta, NYC, Miami, Dallas** (each with cost-of-living, talent pool, and market modifiers)
- **First priced round** finalized here; valuation sets ceiling for growth mechanics
- **Free-buy satellite offices** to increase headcount caps (spreadsheet-style rows: location, seats, monthly burn)

### Stage: IPO ($1B revenue)

- IPO window opens; timing matters (market sentiment from news layer, metrics thresholds)
- Post-IPO: tradable **stock price** simulation, secondary raises, founder stake value
- **End game:** Cash out → AI news article + summary screen (shares × price, rank, equity retained)

---

## Startup categories

Player picks one at new game (affects research tree labels, task templates, unit economics defaults — not different code paths per category if data-driven).

Initial category list (expand via JSON data):

- B2B SaaS
- Consumer social
- Marketplace / gig (Uber-like)
- Delivery / logistics (Instacart-like)
- Fintech
- AI tools
- Hardware + software
- Healthtech
- Climate / energy
- Gaming / media

Each category defines: `defaultACV`, `salesCycleWeeks`, `viralityCoeff`, `regulatoryRisk`, `featureThemes[]`.

---

## Core loops

### 1. Calendar (12-month year, repeatable)

- Time unit: **Month** (display as `Month M, Year Y` — Year 1 starts at incorporation)
- Each month:
  1. Player receives **4–8 counted tasks** (capacity by stage; garage = 4)
  2. Player completes tasks (marketing campaign, product sprint, partnership, etc.)
  3. **Staff/finance/admin** actions do **not** consume task slots (hiring, firing, budget sliders, cap table view)
  4. End month → resolve: revenue, burn, payroll, random events, **AI news batch**, social feed tick, chief-of-staff digest optional
- Years roll indefinitely until win/exit; difficulty and story beats can reference real-world **fictional timeline** (see News)

### 2. Finance

State fields (minimum):

- `cash`, `monthlyBurn`, `lifetimeRevenue`, `mrr` / `arr` (category-dependent)
- `valuation`, `lastRound`, `instruments[]`
- **Cap table:** `{ holderId, name, shares, class, dilutedPct }` — founder starts 100% on 10M authorized (numbers tunable)

**Funding:**

- XC grant: +$500k, defined dilution or SAFE cap (design choice: recommend **7% post-money on SAFE** or fixed **5–10%** on priced seed at raise finalize — tune in balancing)
- **Raises after first close:** optional any time; bad timing hurts valuation / news sentiment
- **Dilution:** each round issues new shares; show pro-forma cap table before confirm

**Revenue:**

- Task outcomes + headcount + product level + marketing spend → monthly revenue delta
- Sandbox: multiply positive outcomes / reduce failure severity (config flags)

### 3. Staff management (spreadsheet UX)

- Table columns: Name (generated or player-edited), Role, Department, Location (remote / hub / satellite), Salary, Start month, Productivity modifier
- Add row / remove row; bulk adjust by department budget caps
- **Garage:** max 2 remote until office stage
- Layoffs: instant burn reduction; may trigger **negative AI news** if size > threshold

Departments (budget roll-ups): Engineering, Product, Sales, Marketing, G&A, Support.

### 4. Counted monthly tasks

Task types (data-driven `TaskDefinition`):

- Run marketing campaign (channel pick)
- Ship feature (from research queue)
- Research node unlock
- Sales push / enterprise deal attempt
- Partnership / BD
- Fundraising prep (post-XC unlock)
- XC-specific tasks during residency

Each task: `{ id, title, description, duration: 'month', cost, outcomes: { revenue, product, buzz, risk } }` with RNG bands.

---

## Social media (LinkedIn + X clones)

Two tabs inside **Social** panel — visually distinct but structurally shared:

| Surface | UX cues |
|---------|---------|
| **ProNet** (LinkedIn-like) | Blue-gray, long-form posts, reactions, comment threads, “professional” tone |
| **Chirp** (X-like) | Short posts, reposts, likes, tighter character limit |

**Player:** compose post (text + optional “announcement” template).

**AI:**

- On month advance and on player post: generate NPC comments, likes, reposts from seeded personas (investors, competitors, employees, randos)
- Personas stored in save; relationship scores affect tone
- Rate-limited via same narrative API as other games

**Persistence:** last 90 days of posts in save; older archived in `socialArchive[]` (optional view).

---

## AI news

- **Tab: World & Tech News** — 3–4 articles max per month after month-end
- Replace prior month’s feed on advance (archive accessible in **News Archive** subview)
- Mix:
  - **Industry react** to player (funding, layoffs, launches, scandals)
  - **Global fictional timeline** (e.g. *Artemis IV lands June 2028*) — seeded timeline JSON + AI fill-in
  - **Macro** (rates, AI regulation) affecting modifiers lightly

**API kind:** `startup_news_month` → returns `{ articles: [{ headline, dek, body, source, date }] }`

---

## Chief of staff (AI chatbot)

- Docked panel or modal: chat UI
- System context bundle each request:
  - Stage, cash, burn, runway, revenue, cap table summary, active tasks, recent news headlines, staff count
- **kind:** `startup_advisor_chat` (multi-turn: client sends last N turns + snapshot)
- Guardrails: no real financial advice disclaimer in footer; suggest in-game actions only
- Fallback: scripted tips if API offline

---

## AI infrastructure

Reuse **HOS narrative Lambda** pattern (`infra/lambda/hos-narrative` or rename to shared `game-narrative`):

| kind | Purpose |
|------|---------|
| `startup_news_month` | Monthly articles |
| `startup_social_reactions` | Comments on player posts |
| `startup_xc_interview` | XC Q&A lines |
| `startup_advisor_chat` | Chief of staff |
| `startup_ipo_press` | IPO / step-down story |

**Model:** Same secret + env as other games; target **`gpt-5-mini`** (or project default when `OPENAI_MODEL` is set — align deploy with “5.4 mini” user naming).

**Client:** `modules/NarrativeApi.js` mirroring HOS — resolve URL from config inject + optional `/play/startup-sim/narrate` proxy on production domain.

**Rate limits:** reuse IP bucket; stricter for chat (e.g. 10/min).

---

## Assets (Commons-first)

No placeholder “slop” art in production builds. Track provenance in `work/startup-sim/ASSETS.md`.

**Sources:**

- [Kenney.nl](https://kenney.nl) (CC0 UI/icons)
- [OpenGameArt.org](https://opengameart.org) (check per-asset license)
- [Wikimedia Commons](https://commons.wikimedia.org) (buildings, cities, logos-free photos)
- [Poly Haven](https://polyhaven.com) if 3D ever needed (CC0)
- [Google Material Symbols](https://fonts.google.com/icons) / Phosphor (icon fonts, acceptable licenses)

**Needs:**

- Garage interior / exterior
- Small office
- City skylines (5 hubs)
- UI chrome (desks, charts)
- Avatar silhouettes for social

**Pipeline:**

1. Curate asset manifest JSON (`assets/manifest.json`) with `{ id, path, license, author, url }`
2. Build script validates manifest present for release
3. Optimize PNG/WebP in repo under `work/startup-sim/assets/`

---

## UI / screens

1. **Start:** New / Load / Settings (API status)
2. **Setup:** Mode, sandbox cash dropdown, company name, category
3. **Main shell:** Top bar (month, cash, revenue, runway) + tabs:
   - **Desk** (tasks + quick actions)
   - **Product** (research / dev queue)
   - **Growth** (marketing & sales)
   - **People** (staff spreadsheet)
   - **Finance** (burn, cap table, raise flow)
   - **Social** (ProNet + Chirp)
   - **News**
   - **Advisor** (chat)
4. **Modals:** Raise wizard, XC application, IPO, month-end summary
5. **End:** Step-down summary + shareable stats

---

## Data & modules (proposed)

```
work/startup-sim/
  index.html
  style.css
  game.js                 # bootstrap, routing, month loop
  narrative-api.json      # injected URL (build)
  modules/
    startup-config.js     # injected constants
    GameState.js          # authoritative state + reducers
    Calendar.js             # month advance, task slots
    Progression.js          # stage gates
    Finance.js              # cash, revenue, cap table, rounds
    Staff.js                # roster CRUD
    Tasks.js                # task deck + resolution
    Categories.js           # startup type data
    Social.js               # feeds + post composer
    News.js                 # archive + display
    NarrativeApi.js         # AI client
    Advisor.js              # chat UI + context builder
    Storage.js              # localStorage saves
    UI.js                   # DOM
    utils.js
  data/
    categories.json
    tasks.json
    research-trees/
    news-timeline-seed.json
    personas.json
```

---

## Save format

- `version`, `mode`, `sandboxStartingCash`, `company`, `calendar`, `finance`, `staff[]`, `product`, `social`, `newsArchive`, `flags` (xcAccepted, ipoCompleted, etc.)
- Migrate on version bump

---

## Implementation phases

### Phase 0 — Scaffold (this PR)

- [x] Plan document
- [ ] WIP registry + play route + copy-work
- [ ] Start screen shell + empty module graph
- [ ] ASSETS.md + empty manifest

### Phase 1 — Core sim (no AI)

- GameState, calendar, 4 garage tasks, basic revenue/burn
- Garage → office gate at $50k
- Save/load
- Category picker affects constants

### Phase 2 — Staff & finance depth

- Spreadsheet staff, departments, layoffs
- Cap table + XC funding + first raise wizard
- Office → XC gate at $500k

### Phase 3 — Progression & cities

- XC 3-month arc (scripted if no AI)
- Hub selection + satellite offices
- Task count scaling by stage

### Phase 4 — AI layer

- Lambda kinds + client NarrativeApi
- News tab + monthly generation
- Social reactions
- Advisor chat

### Phase 5 — IPO & endgame

- $1B gate, IPO timing, stock sim
- Cash-out ending + archive stats
- Balance pass + sandbox tuning

### Phase 6 — Polish

- Commons assets wired per manifest
- Accessibility, mobile layout, tutorials
- Status **live** on work index

---

## Open decisions (for later discussion)

1. **XC interview:** fully AI vs hybrid scripted questions?
2. **Exact dilution defaults** per round (seed / A / B templates)
3. **Stock sim granularity** post-IPO (daily vs monthly ticks)
4. **Real company names** in news parody — avoid; use fictional analogs
5. **Multiplayer / leaderboards** — out of scope unless requested

---

## Success metrics (dev)

- Playable garage → office loop without AI
- One full career path to IPO in under ~2 hours (target)
- API costs bounded (monthly batch + chat limits)
- Lighthouse reasonable for static shell

---

## References in repo

- HOS: week loop, `NarrativeApi.js`, Lambda `hos-narrative`
- EER: meter consequences, AI inbox JSON shape
- Deploy: `docs/hos-openai-aws.md`, `scripts/inject-hos-config.mjs` (pattern for startup-sim inject)
