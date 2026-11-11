# CFB Dynasty Simulator — Deep Research Plan

**Anchor date for world data:** 11 November 2026 (use 2026 football season membership effective 1 July 2026).  
**Product:** Text-first dynasty sim; player starts as **OC or DC**, climbs to **head coach**.  
**Scope:** All **FBS** (138 teams) and **FCS** (128 teams, 13 conferences + independents) with real names and real conferences.

This document is the **research blueprint** for `GAME_DESIGN.md` and for `data/` ingestion. Each phase ends in **verifiable artifacts** (CSVs/JSON + citation log), not prose-only notes.

---

## 0. Research principles

| Principle | Rule |
|-----------|------|
| **Source of truth ladder** | (1) NCAA / conference official releases → (2) AP / ESPN / fbschedules alignment posts (July 2026 effective) → (3) Fear The FCS / Hero Sports / Opta Analyst FCS lists → (4) Sports Reference for historical validation only |
| **Two-key confirmation** | Every school’s conference appears in **≥2 independent sources** before it lands in `schools.json` |
| **No invented facts** | Stadium capacity, budgets, and coordinator names are **optional modules** until sourced; conference + division + subdivision are **mandatory** |
| **Versioning** | `dataVersion: "2026.11.11"` + `alignmentEffective: "2026-07-01"` on every export |
| **Legal** | School names, conferences, and public schedules are factual; avoid NCAA / conference trademarks in marketing UI; no official logos in v1 |

---

## Phase 1 — Membership & alignment (Week 0–1 of research)

**Goal:** Canonical `schools.json` with 138 FBS + 128 FCS rows.

### 1.1 FBS conference matrices

**Primary source:** [FBSchedules — 2026 realignment effective July 1, 2026](https://fbschedules.com/college-football-realignment-conference-changes-for-2026-take-effect-today/)

Build one sheet per conference (target counts):

| Conference | Teams | Notes |
|------------|------:|-------|
| SEC | 16 | No 2026 moves |
| Big Ten | 18 | No 2026 moves |
| ACC | 17 | No 2026 moves |
| Big 12 | 16 | No 2026 moves |
| American | 14 | No 2026 moves |
| Sun Belt | 14 | +Louisiana Tech, −Texas State |
| MAC | 13 | +Sacramento State (FCS↑), −Northern Illinois |
| Mountain West | 10 | −5 to Pac-12; +NDSU, NIU, UTEP |
| Pac-12 | 8 | Rebuilt: 2 legacy + 6 arrivals |
| Conference USA | 10 | −La Tech, −UTEP |
| FBS Independents | 2 | Notre Dame, UConn |

**Cross-check:** [Yahoo Sports — 11 FBS moves July 1, 2026](https://sports.yahoo.com/articles/fbs-teams-change-conferences-july-040100601.html), [USA Today alignment summary](https://www.usatoday.com/story/sports/ncaaf/2026/08/15/college-football-conference-realignment-changes-2026/91318752007/).

**Deliverables:**

- `data/conferences/fbs_2026.json` — conference metadata, division flags (Sun Belt E/W, SWAC E/W, etc.)
- `data/schools/fbs_2026.json` — `{ id, name, conferenceId, subdivision, state, timezone, fbsSince?, priorConference? }`
- `research/citations/fbs_alignment.md` — row-level citations for the 11 movers

**Mover list (must be explicit in data):**

Boise St, Colorado St, Fresno St, San Diego St, Utah St → Pac-12  
Texas St → Pac-12  
Louisiana Tech → Sun Belt  
UTEP → Mountain West  
Northern Illinois → Mountain West (football)  
North Dakota St → Mountain West (football, FCS↑)  
Sacramento St → MAC (FCS↑)

### 1.2 FCS conference matrices

**Primary sources:**

- [Fear The FCS — 2026 conferences & teams](https://fearthefcs.com/fcs-conferences-and-teams/)
- [Opta Analyst — 2026 FCS conference previews](https://theanalyst.com/articles/fcs-football-conference-previews-2026)
- [Opta — FCS realignment changes 2026](https://theanalyst.com/articles/fcs-conference-realignment-changes-2026-football-season)

**13 conferences + independents:**

Big Sky (13), CAA (13), Ivy (8), MEAC (6), MVFC (9), NEC (8 + Chicago St indyrule), OVC (8), Patriot (10), Pioneer (11), SoCon (10), Southland (10), SWAC (12), UAC (8), FCS Independents (Chicago St, Merrimack).

**Deliverables:**

- `data/conferences/fcs_2026.json`
- `data/schools/fcs_2026.json`
- `research/citations/fcs_alignment.md` — document NDSU/Sac State departures, Villanova/William & Mary → Patriot, Tennessee Tech → SoCon, Saint Francis → D-III exit

### 1.3 QA gates (automated)

```text
assert count(FBS) == 138
assert count(FCS) == 128
assert no duplicate school ids across files
assert every school.conferenceId exists
assert subdivisions ∈ { FBS, FCS }
```

Script: `scripts/cfb-dynasty-validate-data.mjs` (to be written in implementation phase).

---

## Phase 2 — Competitive structure (scheduling, playoffs, bowls)

**Goal:** Rules engine inputs for “who plays whom” and “what winning means” in 2026.

### 2.1 FBS

| Topic | Research questions | Sources |
|-------|-------------------|---------|
| CFP format | 12-team? Seeding? Byes? | NCAA / CFP official, ESPN explainer |
| Conference championships | Which leagues hold CG? (Pac-12 returns 8-team CG) | Conference sites, fbschedules |
| Bowl tie-ins | Group of 5 access, NY6 rotation | bowlseason.com, NCAA bowl manual |
| Scheduling | Conference game counts (9 vs 8), SEC vs Big Ten models | Conference scheduling releases |

**Deliverables:** `data/rules/fbs_competition_2026.json`, section in GDD “Season structure”.

### 2.2 FCS

| Topic | Research questions | Sources |
|-------|-------------------|---------|
| Playoff field size | 24-team bracket era | NCAA FCS handbook, NCAA.com |
| Automatic qualifiers | Conference champs | NCAA criterion docs |
| Ivy / Pioneer restrictions | No postseason — sim must model “ineligible” | Conference bylaws (summaries) |

**Deliverables:** `data/rules/fcs_competition_2026.json`.

---

## Phase 3 — Personnel & career ladder (game-specific)

**Goal:** Define OC/DC → position coach → coordinator → HC progression without 3D gameplay.

### 3.1 Role taxonomy

Research **real job families** (for narrative + hiring pools):

- OC / DC / co-OC / run-game / pass-game / ST coordinator
- Analyst, QC, GA (entry)
- HC, Associate HC

**Sources:** Team media guides (sample 10 FBS + 10 FCS PDFs), 247Sports staff lists, official athletics “football staff” pages.

**Deliverables:**

- `docs/GAME_DESIGN.md` § Career ladder
- `data/roles/coaching_roles.json`

### 3.2 Hiring & firing dynamics

| System | Research focus |
|--------|----------------|
| Carousel timing | December–January HC cycle; mid-season OC/DC churn |
| Buyouts | Order-of-magnitude from published contracts (public schools) |
| Internal promotion | % coordinators promoted vs external (academic study or media survey) |

**Deliverables:** GDD § Labor market; tuning constants file `data/tuning/carousel.json` with sourced ranges.

### 3.3 Scheme & identity (text stats)

Map **offensive / defensive identities** to sim axes (not Madden):

- Offense: tempo, run/pass, RPO rate, explosive rate, stuff rate allowed
- Defense: man/zone tilt, pressure rate, havoc rate

**Sources:** CollegeFootballData.com API docs (if licensed), PPA/explosiveness glossary (Bill Connelly), team season stat pages.

**Deliverables:** `data/schemes/archetypes.json`, GDD § Scheme fit.

---

## Phase 4 — Simulation model (text-forward)

**Goal:** Week-by-week loop that respects real opponents and conference races.

### 4.1 Comparable products (mechanics only)

| Title | Steal | Avoid |
|-------|-------|-------|
| Football Coach: College Dynasty | Text games, program builder | Pixel/UI parity |
| Gridiron Dynasty (mobile) | Staff upgrades | Paywall structure |
| OOTP / FM | Depth of season sim | Non-football complexity |
| Startup Simulator (this repo) | Month desk, events, heat/caps | Business skin |

**Deliverable:** GDD § Core loops (see `GAME_DESIGN.md`).

### 4.2 Simulation granularity

Research decision: **drive-based** vs **possession-based** vs **game script** (recommended v1: **possession-based** with narrative log, 8–14 possessions/game).

**Validation:** Backtest 20 historical games (2025 season) for score distribution sanity (not Vegas accuracy).

**Deliverable:** GDD § Match engine; `docs/MATCH_ENGINE_SPEC.md` (Phase 4b).

### 4.3 Recruiting (optional v1.5)

FBS vs FCS pipelines, nil informal modeling — **defer full NIL** until Phase 5 legal review.

**Deliverable:** GDD roadmap milestone.

---

## Phase 5 — Data acquisition pipeline

**Goal:** Repeatable refresh when realignment happens again.

| Asset | Method | Refresh cadence |
|-------|--------|-----------------|
| Schools / conferences | Manual curated JSON + CI validation | Annual (July) |
| Rosters | Optional CSV import; default = generated classes | Per save |
| Schedules | Import from CFBD or fbschedules scrape (license check) | Preseason only |
| Rankings | Poll stubs derived from sim | Weekly in-game |

**Deliverables:**

- `scripts/cfb-dynasty-import-schools.mjs`
- `AGENTS.md` for the subproject (pattern from startup-sim)

---

## Phase 6 — UX & content (text-first)

**Goal:** Wireframes for screens without art budget.

**Screens (research for copy tone):**

1. Career hub (current job, offer inbox, reputation)
2. Weekly desk (game prep, install, recruiting visit, film — pick 3)
3. Gamecast (play-by-play text, drive summaries)
4. Standings / CFP tracker
5. Job market / carousel

**Deliverables:** `docs/UX_FLOW.md`, wire ASCII in GDD appendix.

---

## Phase 7 — Legal, ethics, accessibility

- Confirm **factual use** of school names (standard sports sim practice; no official marks)
- Content warning for gambling-adjacent spread copy if used
- Color-blind safe UI (startup-sim CSS patterns)

**Deliverable:** `docs/COMPLIANCE.md` one-pager.

---

## Research schedule (recommended)

| Phase | Output | Blocker for |
|-------|--------|-------------|
| 1 | School DB | Any playable season |
| 2 | Season rules | Standings / playoffs |
| 3 | Career ladder | Core fantasy (OC→HC) |
| 4 | Match engine spec | Fun factor |
| 5 | Tooling | Maintenance |
| 6 | UX | Implementation sprint |
| 7 | Compliance | Public deploy |

**Critical path:** Phase 1 → Phase 3 → Phase 4 → MVP vertical slice (one school, one conference season, coordinator career).

---

## Immediate next actions (for implementation agent)

1. Generate `data/schools/fbs_2026.json` from FBSchedules + Fear The FCS crosswalk (automate from embedded lists in `GAME_DESIGN.md` appendix A).
2. Add `scripts/cfb-dynasty-validate-data.mjs` with count assertions.
3. Scaffold `work/cfb-dynasty-sim/` module layout mirroring `startup-sim` (`game.js`, `modules/Calendar.js`, `modules/Career.js`, `modules/GameSim.js`).
4. Vertical slice milestone: **2026 Sun Belt** — player is OC at Louisiana Tech (first year in SBC), 14-team schedule, text gamecasts.

---

## Source bibliography (starter)

1. FBSchedules — 2026 FBS alignment (July 1 effective)  
2. Yahoo Sports — 11 FBS conference moves  
3. AP News — Texas State to Pac-12  
4. Fear The FCS — 2026 team/conference counts  
5. Opta Analyst — FCS 2026 previews & realignment  
6. Hero Sports — FCS membership tables  
7. Sports Reference CFB — historical validation  

Log additions in `research/citations/BIBLIOGRAPHY.md` as research proceeds.
