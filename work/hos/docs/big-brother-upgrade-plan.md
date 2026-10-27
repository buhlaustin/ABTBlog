# House of Strategy — Big Brother upgrade (draft plan)

**Goal:** Make HOS feel closer to *Big Brother* (US-style): **16 houseguests**, a full summer arc, jury, and recognizable weekly rhythm—without turning a browser text game into a pixel-perfect show simulator.

**Current baseline (v0.1):**

| Area | Today |
|------|--------|
| Cast | **11** total (1 player + 10 AI) — `GameState` / `game.js` `aiCount: 10` |
| Week | Days **1–5** social → **Day 6** HOH comp → noms → POV → eviction |
| Endgame | **Final 2** auto-resolved by stat score (`checkWinCondition`) — **no jury** |
| Evicted player | Spectator mode only |
| AI | Alliances, personalities, nominations, votes — scales O(n) per social day |
| UI | Single houseguest list column; fine at 11, tight at 16 |
| Content | Generic “reality show” copy; one trivia Q still says **11** HGs |

---

## Design north star

1. **Cast size:** **16 houseguests** (you + **15** AI) as the default “Standard” season.
2. **One eviction per week** (baseline); optional **double eviction** weeks as a late-season twist (Phase 2+).
3. **Jury:** Evicted players (from jury start onward) become jurors; **Final 2** (or **Final 3**) decided by **jury vote**, not hidden stat tiebreak.
4. **BB cadence in copy/UI:** HOH → Nomination ceremony → **Power of Veto** → Veto meeting → **Live eviction** (even if still text-based).
5. **Readable at 16:** UI and AI must stay playable in the browser without 15-click fatigue.

Out of scope for v1 of this upgrade (nice later): full Have-Not slop, Battle of the Block, America’s Vote, extensive voice/avatar assets.

---

## Target season shape (16 HG)

Roughly aligned with a compressed BB summer:

| Week | House count (after eviction) | Notes |
|------|------------------------------|--------|
| 1 | 16 → 15 | Move-in week; introduce cast |
| 2–10 | 15 → 6 | Standard evictions |
| ~11 | 6 → 5 | **Jury starts** (config: when ≤7 or ≤8 remain—pick one and document) |
| 12–14 | 5 → 2 | Jury grows; relationships matter for finale |
| Finale | 2 (or 3) | HOH / final comps → jury vote for **$500k** winner |

**Jury start rule (recommendation):** When **7 or fewer** houseguests remain, the next evictee is the first juror (matches “jury of 9” from a 16-person cast). Alternative: first juror at **10 remaining** for a longer jury phase—tunable in config.

**Difficulty presets (cast size):**

| Mode | HGs | Purpose |
|------|-----|---------|
| Quick | 12 (11 AI) | Shorter sessions |
| **Standard** | **16 (15 AI)** | Default BB feel |
| Legacy | 11 (10 AI) | Current behavior for saves / nostalgia |

---

## Milestone 1 — Foundation: 16-person cast

**Outcome:** New games default to 16 HGs; balance and UI don’t break.

### Code / data

- `game.js`: `aiCount: 15` (or derive from `CAST_SIZE - 1`).
- `GameState`: `castSize` in constructor + serialized save; `generateAINames(15)` (pool already has 32 names in `utils.js`).
- `Competition.js`: Fix static trivia (“How many houseguests…”) → dynamic from `state.getActiveContestants().length` at season start.
- `README.md`, site copy (`content/work/hos.md`, work registry summary): **16 houseguests**.
- **Save migration:** `saveVersion` field; if old save has 11 cast, either block with message or offer “continue legacy season.”

### Balance (playtest after implementation)

- **Social actions:** With 15 AI/day, `AIController.runSocialPhase()` may flood the story log. Mitigations:
  - Cap logged AI events per day (e.g. show 3–5 highlights + “…and other conversations in the house”).
  - Batch low-priority AI actions off-screen.
- **Difficulty:** Consider +0/+1 `actionsPerDay` on Easy only; Hard unchanged.
- **Threat / nomination math:** Re-tune so HOH doesn’t always nom the same two floaters by Week 3.

### Acceptance

- [ ] New game welcome text shows **16** HGs.
- [ ] Houseguest panel scrolls cleanly on 1280×720 and mobile.
- [ ] Week 1–3 playable without runaway AI log spam.

---

## Milestone 2 — Big Brother week rhythm (presentation + rules)

**Outcome:** Players recognize the show’s weekly beats.

### Week structure (keep engine, improve labels)

Current flow already maps well:

```
Days 1–5  → Social (strategy, alliances)
Day 6     → HOH competition
          → Nomination ceremony (2 nominees)
          → POV competition + veto meeting
          → Eviction vote
Week end  → Reset HOH/nom flags; optional “After Dark” flavor line
```

**Tasks:**

- `PHASE_LABELS` + story log: use BB terms (**Head of Household**, **Power of Veto**, **Block**, **Replacement nominee**).
- When POV saves a nominee, HOH **must** renom (already partially there—verify edge cases with 16 HGs).
- **Eviction vote copy:** “By a vote of X to Y, [name] is evicted from the Big Brother house.”
- Optional: `weekDayLabel()` → “Thursday – Veto Ceremony” style strings (cosmetic).

### Rules to verify / fix

- HOH cannot be evicted; HOH not on block unless POV rules say otherwise (BB: HOH not in POV pool except BB6-style twists—skip twists in v1).
- **Tie vote:** HOH breaks tie (add if missing).
- **Self-eviction / duplicate votes:** Guard with tests or manual QA checklist.

### Acceptance

- [ ] Full week readable as a BB episode outline in the story log.
- [ ] Player can win POV, take self off block, see renom + eviction.

---

## Milestone 3 — Jury & finale (core BB identity)

**Outcome:** Winning means **jury respect**, not a stat duel at Final 2.

### State model

Add to `GameState`:

```text
jury: ContestantId[]
jurorStartThreshold: number   // e.g. 7 HGs remain
phase: 'playing' | 'jury' | 'finale'
```

On eviction:

- If `activeCount > threshold` → evictee leaves (ghost / spectator).
- If `activeCount <= threshold` after eviction → evictee joins `jury` (still `evicted` flag, plus `isJuror: true`).

### Finale flow (recommended for text UI)

**Final 3** (BB modern, simplified):

1. When **3** remain → **Final HOH** comp (single comp or best-of-one).
2. HOH evicts one → **Final 2** face jury.
3. **Jury statements** (auto-generated per juror: grudge, respect, alliance loyalty).
4. Player gets **final speech** (optional text area or canned choices).
5. Reveal votes in log; plurality wins.

Remove or gate old `checkWinCondition` stat tiebreak at Final 2; use only if jury somehow empty (fallback).

### Player evicted → juror

- If evicted after jury starts: UI mode **“Jury house”** — read-only story, see remaining comps/evictions, optional “bitter jury” stat hidden from player until finale.
- If evicted before jury: current spectator mode.

### AI

- `AI.js`: Jurors vote using relationship history, promises broken, “blood on hands,” HOH reigns—not random.
- Campaign in final week: active HGs can **campaign** jurors (new action or auto narrative).

### Acceptance

- [ ] 16-person season ends with jury vote, not stat compare.
- [ ] Evicted player after jury start sees differentiated UI copy.

---

## Milestone 4 — Cast, drama, and BB flavor

**Outcome:** 16 distinct characters; house feels crowded and political.

### Cast generation

- **Archetypes:** Expand `PERSONALITY_TYPES` or add **cast templates** (showmance-prone, challenge beast, villain, old-school floater) with weighted spawn so 16 aren’t 16 strategists.
- **Visual distinction:** Abbrev badges + color chips in houseguest list (no art required).
- **Relationships:** On move-in, seed 2–3 pre-existing “pairs” (showmance / enemies) for instant drama.

### Events (`Events.js`)

- BB-styled incidents: **Fight**, **Temptation** (minor stat swing), **Letter from home**, **Power twist announcement** (double eviction week).
- Scale event frequency with house size (more HGs → more rumor events, capped per day).

### Competitions (`Competition.js`)

- Rename comps to BB parody names (“BB Classic Trivia,” “Before or After,” “Pressure Cooker” endurance text).
- HOH and POV **different comp pools** (BB often uses separate comps—can reuse engine with `comp.stakes: 'hoh' | 'veto'`).

### Acceptance

- [ ] Playtesters can name 3–4 standouts from a random cast after Week 2.
- [ ] At least 1 double-eviction week possible in Standard season (optional flag).

---

## Milestone 5 — UI/UX for 16 houseguests

**Outcome:** Information density matches a big cast.

### Houseguest panel (`UI.js` + `style.css`)

- **Tabs or filters:** All | In house | Jury | Evicted.
- **Compact row:** Avatar initial, name, HOH/POV/nom badges, mini relationship to player (color bar).
- **Search / sort:** Threat, relationship, competition stat.
- **Alliance panel:** Show top 3 alliances only + “+2 more” to avoid wall of text.

### Story log

- Collapsible days; pin **HOH / Nom / Veto / Eviction** headers.
- “Previously on…” one-liner at week start.

### Setup screen

- Cast size selector (Quick / Standard / Legacy).
- Short BB disclaimer (fan sim, not CBS).

### Acceptance

- [ ] No horizontal overflow on houseguest list at 16.
- [ ] Player can find “who is HOH” in one glance.

---

## Milestone 6 — Performance, saves, deployment

- **AI budget:** Target &lt;50ms social tick on mid laptop (profile if needed).
- **Save size:** 16 contestants × ~15 weeks JSON — monitor `localStorage` limit.
- **Copy pipeline:** After `work/hos/` changes, run `npm run prebuild` so `/play/hos/` on austinbuhltech.com matches.
- **Changelog** in `work/hos/README.md` when Milestone 1 ships.

---

## Suggested implementation order

```text
M1 Cast (16) + UI scroll + save version
    ↓
M2 BB labels + tie vote + renom polish
    ↓
M3 Jury + finale (biggest rules change)
    ↓
M5 UI filters (can overlap with M3)
    ↓
M4 Content/drama/comp variety
    ↓
M6 Perf + deploy QA
```

**Estimated touch map (primary files):**

| File | M1 | M2 | M3 | M4 | M5 |
|------|----|----|----|----|-----|
| `game.js` | ✓ | ✓ | ✓ | | ✓ |
| `GameState.js` | ✓ | ✓ | ✓ | | |
| `Eviction.js` | | ✓ | ✓ | | |
| `AI.js` | ✓ | | ✓ | ✓ | |
| `Competition.js` | ✓ | ✓ | | ✓ | |
| `Events.js` | | ✓ | | ✓ | |
| `UI.js` / `style.css` | ✓ | | ✓ | | ✓ |
| `Contestant.js` | ✓ | | ✓ | ✓ | |
| `Storage.js` | ✓ | | ✓ | | |

---

## Risks & decisions (need your call)

1. **Final 2 vs Final 3** — Plan assumes **Final 3 → jury picks from 2**. OK?
2. **Jury start at 7 HGs** — OK, or start earlier/later?
3. **Double eviction** — Include in Standard season or “Hard mode” only?
4. **Real BB IP** — Keep parody names (“Power of Veto” is fine; avoid CBS logos/trademarks in UI).
5. **Player death spiral** — Early eviction common at 16; jury/spectator mode must stay fun (M3).

---

## Success metrics (informal)

- Standard season: **~12–15 weeks** to winner.
- **≥60%** of playtesters describe it as “Big Brother–like” without prompt.
- Median session: player reaches **jury phase or Final 5** before quitting (tune difficulty if not).

---

*Draft — Oct 2026. Update this doc as milestones ship.*
