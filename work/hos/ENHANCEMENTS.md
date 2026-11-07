# House of Strategy — enhancement roadmap

Living design notes for features **not yet built**. Items marked **shipped** are in the active PR / current branch.

### Design constraints (Big Brother–realistic)

- A **week** is one full power cycle: **HOH → nominations → POV comp → veto ceremony → eviction vote**, with social days in between.
- **Week 1 premiere** still runs that full cycle. Move-in day adds mingle before the first HOH; it does **not** skip eviction or run noms/POV without a vote later in the same week.
- Twists (double eviction, battle back, audience-style perks) change **how** someone leaves or **what power** they get — they do not leave two nominees on the block with no vote or push eviction to “next week” after a completed veto.

---

## Shipped direction (keep building on this)

### Move-in mingle → Friday HOH (shipped)

**Goal:** Mirror a premiere: social time first, first power competition later the same night — not eviction or nominations before anyone has won HOH.

**Player experience:** New games open on **Week 1, Friday**. The player gets normal social actions and optional host narration, then explicitly starts **“Begin first HOH competition”** when ready. The calendar continues Sat noms → Sun POV → Mon veto → Tue–Wed strategy → Thu eviction.

**Implementation (current):** `GameState` starts `weekdayIndex = 0` with `COMPETITION`; `runEventDaySocialPhase()` uses move-in copy on week 1 Friday; broken saves that hit eviction without noms are repaired on load.

**Follow-ups (optional polish):** One-time move-in host beat; slightly lower AI alliance-formation odds until after the first HOH comp (feels like day-one chaos, still allows deals).

---

## Calendar, twists, and endgame

### Double eviction — rules in UI (shipped core loop)

| Field | Detail |
|--------|--------|
| **Goal** | When ≤8 remain (once per season), Thursday runs **Vote 1 → paused Round 2 cycle (HOH, noms, POV, veto) → Vote 2** with explicit **Continue** between each live event. |
| **Player experience** | Week-start warning; phase badge `Double Eviction · Round N · …`; no auto-blur of Round 2. |
| **Follow-ups** | On-screen rules cheat sheet; jury banner when Round 2 would seat jurors; dev shortcut to force DE week for testing. |
| **Priority** | Polish only — core pacing landed in PR #42. |

### Jury visibility (shipped)

| Field | Detail |
|--------|--------|
| **Goal** | Make jury phase readable before finale. |
| **Player experience** | Sidebar **Jury** panel once jurors are seated: per-juror lean (for/against/undecided), week seated, aggregate summary. First seated juror announced in the feed. |
| **Implementation** | `juryOutlook.js` + `UI.renderJuryPanel`; aligns with finale jury scoring (relationships, grudges, alliances, promises, HOH noms). |
| **Follow-ups** | Final-2 mode comparing two finalists; jury tag on endgame summary. |
| **Priority** | Polish only. |

### Finale structure (shipped core)

| Field | Detail |
|--------|--------|
| **Goal** | Final 3 at three houseguests: **HOH Part 1 → Part 2 → Part 3 → Final HOH pick → Jury Q&A → jury vote**, with Continue between each beat. |
| **Player experience** | Player finalist picks Q&A answers; juror player casts winner vote; Q&A answers sway jurors via `juryQAAdjustments`. |
| **Follow-ups** | Interactive comps for finale parts; jury recap in end screen. Q&A bank: `juryQABank.js` (12 questions, shuffled per finale). |
| **Priority** | Polish only. |

### Twist nights (optional new-game toggles)

| Field | Detail |
|--------|--------|
| **Status** | **Shipped (v2):** setup toggles + cheat sheet; `SeasonTwists.js`. **Double eviction** + jury sidebar note on DE week. **Battle Back** — interactive endurance segment if the player is in the pool; auto-resolve otherwise. **MVP week** — social **Campaign for MVP** (once/day) + AI house chatter; crown at eviction from campaign totals. Twist banner shows MVP race leader. |
| **Goal** | Season-flavored beats that exist on real shows, still ending in someone leaving when eviction night fires. |
| **Follow-ups** | Campaign-for-MVP when player is on the block; dedicated Playwright twist smoke. |
| **Constraints** | No “deferred eviction” after noms/veto. |
| **Priority** | Polish / follow-ups only. |

---

## AI, difficulty, and social depth

### HOH nomination personas

| Field | Detail |
|--------|--------|
| **Status** | **Shipped (v3):** v2 features plus **HOH watch** header lean banner pre-ceremony, **behind-the-scenes** grudge/deal/alliance notes on AI noms, player **veto replacement** persona tags, `nomination_ceremony` narrate API prompt, pre-comp pep reads HOH style. |
| **Follow-ups** | Surface `playerIntel` panel for stored HOH leans. |
| **Priority** | Polish only. |

### Promises, grudges, and betrayal — surface in UI

| Field | Detail |
|--------|--------|
| **Status** | **Shipped (v2):** Intel panel (incl. empty state), houseguest **Deal/Owes you/Bitter** chips, **promise type picker**, AI offers deals to player, AI vote betrayal lines, eviction vote deal warnings. |
| **Follow-ups** | Player accept/decline UI for AI deals; jury feed recap of broken deals. |
| **Priority** | Polish only. |

### Threat band warnings

| Field | Detail |
|--------|--------|
| **Status** | **Shipped (v2):** Band meter (32/52 ticks), top threat drivers, house rank + week delta, nomination **threat alert** in header; `threatOffset` for Rest/Campaign; `formatThreatChange` log copy. |
| **Goal** | Tie UI to easy’s threat-scaled nomination protection. |
| **Player experience** | Bands: Under radar / On the radar / Big target, with one sentence of advice. |
| **Implementation** | `Contestant.threat` thresholds in `UI.js`; update after `updateThreatLevels()`. |
| **Priority** | Medium. |

### Floaters and “shield” targets

| Field | Detail |
|--------|--------|
| **Goal** | AI sometimes nominates obvious pawns so the human isn’t the default second name. |
| **Player experience** | Repeated “easy floaters” in cast; AI HOH occasionally nominates low-threat pairs. |
| **Implementation** | Nomination weight bonus for mid-threat when `difficulty === 'easy'`; floater personality already exists. |
| **Priority** | Low. |

---

## Player agency

### Strategic verbs (constrained)

| Field | Detail |
|--------|--------|
| **Goal** | More BB verbs without full multiplayer. |
| **Options** | **Throw comp** (intentionally weaken comp score when not on the block — classic floater move); **backdoor path** (HOH: nominate pawns Sat, win/use veto Mon, replace with true target — same week, still leads to Thu vote). |
| **Implementation** | New `PlayerActions` entries; hooks in `Competition.js` / `Eviction.js`. |
| **Priority** | Medium. |

### Power of Veto — ceremony clarity

| Field | Detail |
|--------|--------|
| **Goal** | After veto, explain replacement pick and who remains on the block. |
| **Player experience** | Summary card: “Used on X → Y replaced by Z → final nominees: A, B.” |
| **Implementation** | Extra `logAndRender` in `Eviction.js` after `playerPickReplacement` / AI replacement. |
| **Priority** | High — low effort. |

### Alliance map / intel screen

| Field | Detail |
|--------|--------|
| **Goal** | Multiple `allianceIds` are hard to track in list UI. |
| **Player experience** | Simple graph or table: members, exposed/hidden, your memberships. |
| **Implementation** | `UI.js` panel from `GameState.alliances` + `getVisibleAlliances`. |
| **Priority** | Medium. |

### Rest / lay low — feedback

| Field | Detail |
|--------|--------|
| **Status** | **Shipped:** `formatThreatChange` + persistent `threatOffset` so lay-low sticks until recalc/week decay. |
| **Goal** | `rest` lowers threat; player should see delta. |
| **Player experience** | “Threat −4 (now 32 — Under the radar).” |
| **Implementation** | Return structure from `PlayerActions`; `logAndRender` on success. |
| **Priority** | Low. |

---

## Narrative and presentation

### Host beats per phase

| Field | Detail |
|--------|--------|
| **Goal** | One narrated line per live event type (HOH, noms, veto, eviction). |
| **Player experience** | Consistent host voice when API enabled; local fallback lines when not. |
| **Implementation** | `NarrativeApi` prompt kinds; call from `_beginScheduledHouseDay` with `phase` context. |
| **Priority** | Medium. |

### Confessionals

| Field | Detail |
|--------|--------|
| **Goal** | Short flavor after big moves. |
| **Player experience** | “Confessional — Riley: ‘I had to put them up; they’re coming for me next.’” |
| **Implementation** | Template + personality from `Contestant`; optional LLM beat. |
| **Priority** | Low. |

### Week-end recap

| Field | Detail |
|--------|--------|
| **Goal** | Replace single system line with structured recap. |
| **Player experience** | HOH, nominees, veto, evicted, who’s in danger next week. |
| **Implementation** | `runWeekEnd()` in `game.js` reads `history` for the week. |
| **Priority** | Medium. |

---

## UX, onboarding, and fairness

### Week calendar strip

| Field | Detail |
|--------|--------|
| **Goal** | Prevent “what night is it?” confusion. |
| **Player experience** | Fri→Thu strip with highlight on today and icon for live vs social. |
| **Implementation** | `UI.js` + `WEEKDAYS` / `PHASE_LABELS`; mobile-friendly horizontal scroll. |
| **Priority** | High. |

### Tutorial week (scripted)

| Field | Detail |
|--------|--------|
| **Goal** | One optional guided run through first live cycle. |
| **Player experience** | Tooltips on mingle, begin event, end day, actions remaining. |
| **Implementation** | `localStorage` flag `hosTutorialDone`; overlay steps in `game.js`. |
| **Priority** | Medium. |

### Schedule repair transparency

| Field | Detail |
|--------|--------|
| **Goal** | When save repair rewinds calendar, explain why. |
| **Player experience** | Already a story warning; add “View what happened” with before/after weekday. |
| **Implementation** | Log repair metadata in `repairInvalidEvictionSchedule()` for dev; player-safe message in prod. |
| **Priority** | Low. |

---

## Content, replay, and engineering

### Cast presets with twists

| Field | Detail |
|--------|--------|
| **Goal** | Beyond Legacy / Quick / Standard. |
| **Examples** | All-strategists (+AI int), “duo season” (pre-linked pairs), shortened jury cast. |
| **Implementation** | `CAST_PRESETS` in `utils.js`; personality distribution in `_initContestants`. |
| **Priority** | Low. |

### Achievements / run stats

| Field | Detail |
|--------|--------|
| **Goal** | Post-game and cumulative stats. |
| **Examples** | Times nominated, veto wins, alliance betrayals survived. |
| **Implementation** | `StorageManager` profile object; `endGame()` summary. |
| **Priority** | Low. |

### Sandbox / debug week jump

| Field | Detail |
|--------|--------|
| **Goal** | Faster balance testing (aligns with other `work/*` sims). |
| **Implementation** | Dev-only query param or menu: set `weekdayIndex` + phase + sample HOH/noms. |
| **Priority** | Low (dev). |

### Playwright: full Week 1 path

| Field | Detail |
|--------|--------|
| **Goal** | Regression for eviction soft-lock, move-in → HOH, nomination guards. |
| **Implementation** | `e2e/hos.spec.js` on hosted `/play/hos/`; drive mingle, begin HOH, end days through Thu or week end. |
| **Priority** | High — stability. |

### Balance telemetry (dev)

| Field | Detail |
|--------|--------|
| **Goal** | Tune `playerNominationProtection` without ad-hoc Monte Carlo. |
| **Implementation** | `?debug=1` logs nomination rolls; or CI script sampling easy/normal/hard rates. |
| **Priority** | Low (dev). |

---

## Suggested build order

1. **POV ceremony clarity** + **week calendar strip** (player clarity, small diffs).
2. **Promise/grudge surfacing** + **threat bands** (gameplay feel).
3. **Playwright Week 1** (lock in premiere + eviction fixes).
4. **HOH personas** + **week-end recap** (depth).
5. Longer arcs: **double eviction UX**, **finale parts**, optional **twist nights**.

---

## Related files

| Area | Primary modules |
|------|-----------------|
| Week loop | `game.js`, `GameState.js` |
| AI / noms | `AI.js`, `Eviction.js` |
| Comps | `Competition.js` |
| Finisher | `Finale.js` |
| UI | `UI.js`, `style.css` |
| Narration | `NarrativeApi.js`, `docs/hos-openai-aws.md` |
