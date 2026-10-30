# House of Strategy

A single-player text-based social strategy game inspired by reality competition shows like Big Brother.

> **Canonical copy:** This directory is the source for the version hosted at [austinbuhltech.com/work/hos/](https://austinbuhltech.com/work/hos/). Edit here in the monolith repo, not the legacy [buhlaustin/HOS](https://github.com/buhlaustin/HOS) repo.

## Play

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

- 11 houseguests (you + 10 AI contestants) with unique personalities and stats
- Autonomous AI that forms alliances, betrays allies, and votes strategically
- Five competition types: trivia, memory, logic, endurance, and chance
- Full eviction system with vote breakdowns and reasoning
- Random drama events and intel gathering
- Save/load via localStorage
- Three difficulty levels
- Endgame summary explaining your win or loss

## Project Structure

```
index.html          # Game shell and layout
style.css           # UI styling
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
  Storage.js        # localStorage save/load
  utils.js          # Shared helpers
```

## Tech

Vanilla JavaScript (ES modules), HTML, and CSS. No external dependencies.
