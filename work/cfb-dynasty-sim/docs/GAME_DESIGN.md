# CFB Dynasty Simulator — Game Design Document (v0.1)

**Status:** Pre-production (research-backed draft)  
**Anchor world:** 11 November 2026  
**Alignment effective:** 1 July 2026 football membership  
**Platform:** Text-first web sim (patterned after `work/startup-sim/`)  
**Fantasy:** Start as **offensive or defensive coordinator**; earn promotions to **head coach** at real FBS/FCS programs.

---

## 1. Elevator pitch

You are a **rising football mind** taking your first FBS or FCS coordinator job in the turbulent **2026 alignment era**. Each week you **prepare**, **call tendencies**, and **manage staff politics** through text choices and light stat dashboards. Wins build **reputation**; losses and boosters build **pressure**. The carousel can pluck you to a bigger program—or dump you to the FCS if you flame out.

No polygons. Real schools. Real conferences. Pure college football bureaucracy and ball.

---

## 2. Design pillars

1. **Authentic universe** — 138 FBS + 128 FCS schools, correct conferences, 2026 movers (Pac-12 eight, NDSU/Sac State up, etc.).
2. **Career fantasy** — Coordinator-first; HC is earned, not selected at create.
3. **Text is the stadium** — Gamecast prose, drive summaries, headline ticker (AP-style).
4. **Meaningful tradeoffs** — Scheme identity vs roster; aggro game plans vs job security.
5. **Legible depth** — OOTP-deep seasons optional later; MVP is one season + carousel slice.

---

## 3. Player story

### 3.1 Create-a-coach

- **Name, age (28–45), background** (former player / analyst / GA grind).
- **Starting side:** OC or DC only (not HC).
- **Scheme lean:** Pick 1 offensive and 1 defensive archetype (see §6).
- **First job offers:** 3–5 schools filtered by realistic tier (G5 coordinator roles, elite FCS coordinators); weighted by your pedigree roll.

### 3.2 Career ladder

| Stage | Title | Typical employers |
|-------|--------|-------------------|
| 0 | GA / analyst (optional tutorial) | Any |
| 1 | **Coordinator** (player start) | FCS top programs, low G5, maybe P5 if résumé spike |
| 2 | Coordinator at stronger program | SBC, MAC, MW, P5 if breakout |
| 3 | **Head coach** | FCS → G5 → P5 path |
| 4 | Elite HC / rebuild specialist | Brand programs, carousel targets |

**Promotion triggers:** Win %, rivalry upsets, unit rank (SP+ proxy), scandal avoidance, interview minigame during carousel window.

**Failure states:** Fired (1-year coordinator contract), demotion to FCS, forced “year off” analyst role.

---

## 4. Core loops

### 4.1 Weekly loop (in-season)

```text
Monday    — Scouting report (opponent tendencies text)
Tuesday   — Staff meeting (pick 1 emphasis: recruit / fix weakness / hype)
Wednesday — Game plan (3 slider axes → tendencies)
Thursday  — Press / booster heat event (optional)
Friday    — Walkthrough (morale + injury roll)
Saturday  — GAMECAST (text sim)
Sunday    — Box score, film review, AP poll movement, job whispers
```

**Desk actions** (startup-sim style): limited picks per week; coordinator actions bias **your unit**; HC actions bias **whole team** (future).

### 4.2 Seasonal loop

- Conference schedule (real structure; see rules JSON)
- Conference championship week (where applicable)
- Bowl / FCS playoff bracket
- **Carousel window** (December–January): interview offers, buyout math, stay-or-go

### 4.3 Meta loop

- **Reputation** (national, conference, alumni)
- **Scheme mastery** XP on chosen archetypes
- **Coaching tree** (hire away your analysts)

---

## 5. World model

### 5.1 Submotion

- **FBS (138)** — full sim + TV money tiers
- **FCS (128)** — full sim, smaller budgets, playoff chase
- Schools **only move** via documented realignment flags in data (no fictional conferences)

### 5.2 2026 FBS alignment snapshot

Sourced from [FBSchedules July 2026 article](https://fbschedules.com/college-football-realignment-conference-changes-for-2026-take-effect-today/).

**Notable stories for narrative events:**

- **Pac-12** returns at 8 teams (all but Oregon St / Wash St end in “State”).
- **Mountain West** reloads with **North Dakota State** and **Northern Illinois** (football).
- **MAC** gains **Sacramento State** (long travel novelty).
- **Sun Belt** swaps **Texas State** for **Louisiana Tech**.

### 5.3 FCS

128 programs across 13 conferences; **Chicago State** launches football (independent/NEC path); **NDSU** and **Sac State** depart for FBS.

Full team lists: see [Fear The FCS](https://fearthefcs.com/fcs-conferences-and-teams/) and [Opta 2026 previews](https://theanalyst.com/articles/fcs-football-conference-previews-2026).

---

## 6. Systems (MVP scope)

### 6.1 Scheme archetypes

**Offense (pick one lean):**

| Archetype | Tags | Tradeoff |
|-----------|------|----------|
| Spread tempo | pace++, pass+ | Turnovers vs explosiveness |
| Pro-style balance | neutral | Predictable but safe job security |
| Air raid | pass++ | Weather / depth issues |
| Power/run-heavy | run++, clock | Upset lower-talent foes |

**Defense:**

| Archetype | Tags | Tradeoff |
|-----------|------|----------|
| Pressure man | havoc+, risk+ | Big plays allowed |
| Zone chew | clock--, safe | Struggle vs elite WR rooms |
| Pattern matching | adapt+ | Requires smart DB room rating |

**Fit:** Roster **archetype ratings** (not named players in v1) vs scheme → efficiency modifier.

### 6.2 Match engine (v1 target)

- **Possession-based**; 10–14 possessions/game average
- Inputs: team ratings (off/def), home field, weather stub, game plan sliders, coordinator **play-call bias** event deck
- Output: **text log** + final score + unit stats (your side emphasized when OC/DC)
- Upset chance: logistic function on talent gap + chaos roll (college parity)

Spec detail: Phase 4 in `RESEARCH_PLAN.md` → future `MATCH_ENGINE_SPEC.md`.

### 6.3 Staff & contracts

- Coordinator contract **1–3 years**
- Performance triggers (bowl, win total, unit ranking)
- Buyouts as **% of remaining salary** (tuning band from public contract reporting)

### 6.4 Recruiting / NIL

**Post-MVP.** Stub ratings only in v1 (“talent composite” per school from historical priors).

---

## 7. Progression & economy

| Resource | Earned by | Spent on |
|----------|---------|----------|
| Reputation | Wins, ranked wins, bowls | Job offers |
| Job security | Booster events, margin of victory | Avoid firing |
| Scheme XP | Executing game plan | Unlock advanced calls |
| Staff points | Season milestones | Hire small bonuses to unit ratings |

**FBS vs FCS budgets:** Multiplier table (SEC ≈ 4× MAC coordinator salary flavor, not exact dollars).

---

## 8. UI map (text)

1. **Career** — job, salary, contract, reputation, offers inbox  
2. **Program** — roster talent (abstract), schedule, standings  
3. **Week desk** — 3 picks → effects  
4. **Gamecast** — scrolling drive log, speed controls  
5. **Carousel** — interview decisions (December)  
6. **Encyclopedia** — 2026 alignment reference (read-only school DB)

---

## 9. Technical architecture (proposed)

Mirror `work/startup-sim/`:

```text
work/cfb-dynasty-sim/
  game.js
  style.css
  data/
    schools/fbs_2026.json
    schools/fcs_2026.json
    conferences/*.json
    rules/*.json
  modules/
    Calendar.js      — week advance
    Career.js        — jobs, carousel
    GameSim.js       — possession sim
    GameState.js
    Schedule.js
    Standings.js
    TextGamecast.js
```

**Persistence:** `localStorage` save slots; export JSON like startup-sim `RunExport.js`.

---

## 10. MVP definition

**MVP v0.1 — “Coordinator Year One”**

- Player: OC **or** DC at a **Sun Belt** school (default: Louisiana Tech, 2026 new to SBC)
- Full **14-game** conference schedule generation (teams correct; dates abstract “Week N”)
- **Weekly desk + text gamecasts**
- **Win-loss** standings; simple conference title tiebreaker
- **End-of-season carousel** with 3 plausible job offers
- School DB: **all FBS/FCS loaded** for reference; **only Sun Belt simmed** for schedule

**v0.2:** Full FBS conference sim + CFP stub  
**v0.3:** FCS playoff + FCS coordinator start  
**v1.0:** HC role + staff hiring + recruiting sketch

---

## 11. Research → design traceability

| GDD section | Research phase |
|-------------|----------------|
| §5 World | Phase 1 |
| §5.2–5.3 alignment | Phase 1 citations |
| §4.2 bowls/CFP | Phase 2 |
| §3 Career | Phase 3 |
| §6.2 engine | Phase 4 |
| §8 UX | Phase 6 |
| Deploy | Phase 7 |

See `RESEARCH_PLAN.md` for task breakdown.

---

## Appendix A — FBS 2026 conference members (research capture)

Use for first-pass `fbs_2026.json` (verify before ship).

**ACC (17):** Boston College, California, Clemson, Duke, Florida State, Georgia Tech, Louisville, Miami, NC State, North Carolina, Pittsburgh, SMU, Stanford, Syracuse, Virginia, Virginia Tech, Wake Forest  

**American (14):** Army, Charlotte, East Carolina, Florida Atlantic, Memphis, Navy, North Texas, Rice, Temple, Tulane, Tulsa, UAB, USF, UTSA  

**Big 12 (16):** Arizona, Arizona State, Baylor, BYU, Cincinnati, Colorado, Houston, Iowa State, Kansas, Kansas State, Oklahoma State, TCU, Texas Tech, UCF, Utah, West Virginia  

**Big Ten (18):** Illinois, Indiana, Iowa, Maryland, Michigan, Michigan State, Minnesota, Nebraska, Northwestern, Ohio State, Oregon, Penn State, Purdue, Rutgers, UCLA, USC, Washington, Wisconsin  

**Conference USA (10):** Delaware, FIU, Jacksonville State, Kennesaw State, Liberty, Middle Tennessee, Missouri State, New Mexico State, Sam Houston, WKU  

**Independents (2):** Notre Dame, UConn  

**MAC (13):** Akron, Ball State, Bowling Green, Buffalo, Central Michigan, Eastern Michigan, Kent State, Miami (Ohio), Ohio, Sacramento State, Toledo, UMass, Western Michigan  

**Mountain West (10):** Air Force, Hawaii, Nevada, New Mexico, North Dakota State, Northern Illinois, San Jose State, UNLV, UTEP, Wyoming  

**Pac-12 (8):** Boise State, Colorado State, Fresno State, Oregon State, San Diego State, Texas State, Utah State, Washington State  

**SEC (16):** Alabama, Arkansas, Auburn, Florida, Georgia, Kentucky, LSU, Mississippi State, Missouri, Oklahoma, Ole Miss, South Carolina, Tennessee, Texas, Texas A&M, Vanderbilt  

**Sun Belt (14):** Appalachian State, Arkansas State, Coastal Carolina, Georgia Southern, Georgia State, James Madison, Louisiana, Louisiana Tech, Marshall, Old Dominion, South Alabama, Southern Miss, Troy, ULM  

---

## Appendix B — FCS 2026 (128 teams / 13 leagues)

Consult live lists in Fear The FCS / Opta previews for row-complete JSON. Conference sizes:

| Conference | Teams |
|------------|------:|
| Big Sky | 13 |
| CAA | 13 |
| Ivy | 8 |
| MEAC | 6 |
| MVFC | 9 |
| NEC | 8 (+ Chicago St ind. football year) |
| OVC | 8 |
| Patriot | 10 |
| Pioneer | 11 |
| SoCon | 10 |
| Southland | 10 |
| SWAC | 12 |
| UAC | 8 |
| Independents | 2 |

**Departed to FBS:** North Dakota State, Sacramento State.  
**Dropped from FCS:** Saint Francis (to D-III).

---

## Appendix C — Open questions (research backlog)

1. Exact **2026 CFP bracket rules** for sim (12-team confirmation vs future expansion).
2. **Pac-12** basketball-only members (Gonzaga) — ignore for football sim.
3. **UMass** MAC football status long-term — still MAC in 2026 per FBSchedules.
4. **Chicago State** — independent schedule year vs NEC standings.
5. License path for **CollegeFootballData** vs hand-curated schedules.

---

*Document owner: CFB Dynasty pre-production. Phase 1 JSON: `data/schools/fbs_2026.json`, `data/schools/fcs_2026.json` (regenerate via `node scripts/cfb-dynasty-generate-schools.mjs`).*
