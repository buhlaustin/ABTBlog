# Startup Simulator

WIP startup tycoon game (Career + Sandbox modes). See the full design plan in the repo at [`docs/startup-simulator-plan.md`](../../docs/startup-simulator-plan.md) (internal — not published on the marketing site).

## Local play

```bash
npm run copy-work
python3 -m http.server 8080
```

Open `http://localhost:8080/play/startup-sim/index.html` (after copy) or serve this folder directly.

## Status

**Phase 1 complete:** monthly counted tasks on Desk, close month (overhead + progression), category economics, $50k office gate, game over on bankruptcy.

**Phase 2 next:** editable headcount + finalize staffing, cap table / XC funding.
