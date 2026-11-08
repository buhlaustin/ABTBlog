# House of Strategy

A single-player text-based social strategy game inspired by reality competition shows like Big Brother.

**Play online:** [austinbuhltech.com/work/hos/](https://austinbuhltech.com/work/hos/)

## Play locally

Open `index.html` in a modern browser, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## How to Play

1. Enter your name and choose a difficulty level.
2. Weeks run **Friday → Thursday**: **Fri** HOH comp · **Sat** nominations · **Sun** POV comp · **Mon** veto ceremony · **Tue–Wed** social strategy · **Thu** live eviction.
3. Use your actions on social days, then **End Day** — event days wait for **Start [Day]** so nothing auto-skips.
4. Alliances are secret (max 3). You only see other alliances when they’re **exposed** or you’re a member.
5. Survive until you're the last houseguest standing.

## Features

- **Cast presets** — standard through mega (24); All-Stars vs rookies; Brains; jury sprint; twist defaults per preset
- Big Brother-style week: HOH → nominations → Power of Veto → live eviction (Week 1 premiere: mingle, then first HOH)
- **Finale:** Final 3 HOH parts, jury Q&A, jury vote; sidebar **Jury** panel with lean once seated
- Optional season twists: **double eviction**, **Battle Back**, **MVP week** (setup cheat sheet)
- **Deals & grudges**, threat bands, alliance map, veto block clarity, week calendar strip, confessionals, week-end recap
- **Achievements & career stats** — end-game breakdown, badges, `localStorage` profile
- Schedule repair transparency on bad saves
- Autonomous AI; optional **OpenAI host narration** ([docs/hos-openai-aws.md](../../docs/hos-openai-aws.md))
- Five competition types; save/load; Easy / Normal / Hard

## Smoke tests

From the repo root:

```bash
node scripts/hos-confessionals-smoke.mjs
node scripts/hos-week-recap-smoke.mjs
node scripts/hos-week-calendar-smoke.mjs
node scripts/hos-schedule-repair-smoke.mjs
node scripts/hos-cast-presets-smoke.mjs
node scripts/hos-run-stats-smoke.mjs
```

## Project Structure

```
index.html          # Game shell and layout
style.css           # Base UI
ui-refresh.css      # Layout, typography, and surface refresh layer
game.js             # Main game controller and weekly loop
modules/
  Contestant.js     # Houseguest class and stats
  GameState.js      # Core state and week progression
  AI.js             # Autonomous AI behavior
  Competition.js    # Competition types and resolution
  Events.js         # Narrative and drama events
  Eviction.js       # Nominations, veto, and eviction votes
  PlayerActions.js  # Player social actions
  UI.js             # DOM rendering
  Storage.js        # localStorage save/load + career profile
  runStats.js       # Achievements and run stats
  castPresets.js    # Cast presets and twist defaults
  utils.js          # Shared helpers
```

## Tech

Vanilla JavaScript (ES modules), HTML, and CSS. No external dependencies.
