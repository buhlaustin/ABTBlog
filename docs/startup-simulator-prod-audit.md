# Startup Simulator — production readiness audit

Audit date: 2026-11-04 (branch `cursor/startup-simulator-plan-b23b`).

Goal: ship a **complete** garage→IPO tycoon — no stub tabs, no silent failures, no fake task decks, player-visible feedback on every action.

---

## Executive summary

| Area | Verdict |
|------|---------|
| Core loop (desk → month → progression) | **Ship-ready** after feedback + crisis/summary fix |
| All 8 nav tabs | **Ship-ready** — Growth tab now shows rival/sentiment/market |
| Fundraising / XC / hubs / IPO | **Ship-ready** — gates surfaced; sandbox cap table aligned |
| Save/load (v9) | **Hardened** — progression sync, advisor pending reset, cap table repair |
| Data bundle | **Ship-ready** — full JSON imported with client; no emergency task deck |
| Art | **Ship-ready** — original photo backdrops + icons (manifest v4) |
| Live narrative API | **Optional enhancement** — game playable when server quiet; copy no longer alarmist |
| CI | **Ship-ready** — headless smoke + Playwright e2e |

---

## Critical issues found → fixed

### 1. Action feedback wiped on every `refresh()`

**Problem:** Finance, People, Desk, Social, and Offices feedback lived inside panels rebuilt via `innerHTML`. Handlers called `show*Feedback()` then `refresh()`, so players saw **no confirmation** on seed close, staffing, errors, etc.

**Fix:** `modules/GameFeedback.js` + `#game-flash` in the game footer. All `show*Feedback` helpers delegate to `setGameFeedback()`, which survives panel re-renders.

### 2. Month summary skipped when a crisis fired

**Problem:** `handleEndMonth` returned before `openMonthSummaryDialog` if a crisis rolled, hiding cash/burn/runway for the closed month.

**Fix:** Always show month summary (and headlines) first; then route to crisis with a clear footer message.

---

## High issues found → fixed

| Issue | Fix |
|-------|-----|
| Growth tab placeholder only | `renderGrowthPanel()` — rival, heat, rev modifier, buzz, board sentiment, desk tasks left |
| Advisor errors silent | `setGameFeedback` on failed advisor send |
| Pivot feedback destroyed | Same global feedback |
| `normalizeSave` missing progression sync | `syncStageFromProgress()` on load; XC/ipo flags defaulted; `advisor.pending` cleared |
| Sandbox post-XC cap table wrong | `applySeedCapTableSnapshot()` after sandbox bootstrap |
| Series A/B looked broken when sentiment low | Disabled buttons + inline reason under 30/25 |
| IPO copy hard-coded $1B | Uses `getEffectiveIpoGate(state)` |
| Seed rumor headline every month | One-time `seedCelebrationShown` flag |
| Duplicate task IDs same month | De-dupe pass in `dealMonthlyTasks` before repeat-fill |
| Run export URL | Uses current origin `/play/startup-sim/` |
| HoF `cash_out` / `game_over` strings | Player labels via `formatOutcome()` |
| Story server status scared players | Neutral copy when API probe fails |

---

## UI / wiring checklist (verified)

| Surface | Wired |
|---------|--------|
| Title: New / Continue / setup form | Yes |
| Desk: tasks, close month, log | Yes |
| Product: stats + pivot form | Yes |
| Growth: market/competitor/sentiment | Yes |
| People: draft HC, finalize | Yes |
| Finance: XC, seed, A/B, cap table, IPO mount, offices mount | Yes |
| Social: tabs, post, Chirp counter | Yes |
| News: feed, archive toggle | Yes |
| Advisor: ask | Yes |
| Crisis screen | Yes |
| XC interview screen | Yes |
| Game over + export | Yes |
| Month summary dialog | Yes |
| Keyboard 1–8, M | Yes |
| Audio toggle | Yes |
| Hall of fame (start + end) | Yes |

---

## Data & content

- **Tasks:** 29+ definitions; pool ≥ slots for all stages × all 10 categories (headless smoke validates).
- **Hubs:** bay, nyc, miami, dallas, atlanta, nashville — each with photo backdrop.
- **Crises, personas, XC questions, timeline:** Bundled JSON + optional fetch refresh.

---

## Intentional offline behavior (not stubs)

When the narrative API is unreachable, the game still runs using **authored template paths** in News, Social, XC scoring, Advisor, and IPO press. These are content fallbacks, not alternate game modes. Title copy reflects that headlines still update.

---

## Remaining low-priority notes

- `product.featureQueue` is initialized but unused (future feature hook; no player impact).
- `social.archive` trimmed but not shown in UI (posts stay in-network feeds).
- Very small task pools at post_xc (9 tasks, 7 slots) may repeat after de-dupe exhausts — acceptable for v1.

---

## Verification run

```bash
npm run smoke:startup-sim
npm run e2e:startup-sim
node scripts/validate-startup-sim-assets.mjs
```

All passing on audit commit.
