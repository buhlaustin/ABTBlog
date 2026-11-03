# Startup Simulator

WIP startup tycoon game (Career + Sandbox modes). See the full design plan in the repo at [`docs/startup-simulator-plan.md`](../../docs/startup-simulator-plan.md) (internal — not published on the marketing site).

## Local play

```bash
npm run copy-work
python3 -m http.server 8080
```

Open `http://localhost:8080/play/startup-sim/index.html` (after copy) or serve this folder directly.

## Status

**Phase 0 complete:** start/setup flow, full tab shell, department headcount preview (read-only), save/load, data + module stubs.

**Phase 1 next:** monthly task loop, revenue/burn, garage → office gate.
