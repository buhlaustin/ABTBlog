# Startup Simulator

Hosted startup tycoon game (Career + Sandbox modes). Play on the site at `/work/startup-sim/`. Design plan: [`docs/startup-simulator-plan.md`](../../docs/startup-simulator-plan.md) (internal).

## Local play

From repo root:

```bash
npm run dev
```

Open `/work/startup-sim/` (Next) or, after `npm run copy-work`, `/play/startup-sim/index.html` from `public/`.

## Status

**Shipped (Phases 0–6):** core loop, staff/fundraising, XC/hubs, AI news/social/advisor, IPO endgame, CC0 stage icons, tutorials, a11y/mobile polish.

**Phase 7 (in progress):** live AI, depth, meta, UX, **polish** — stage/hub backdrops, optional audio, Chirp counter, expanded public tasks (save v9).

## Build & QA

- `npm run smoke:startup-sim` — headless task-pool and module checks (also runs in `prebuild`)
- `npm run prebuild` — validates assets, smoke, copies to `public/play/`

## Saves

Progress is stored in **`localStorage`** on this device (`startup_sim_save_v1`). The game **auto-saves** after tasks, month close, and most actions; use **Continue saved game** on the title screen to resume. **New game** replaces the save when you start a new company.

## Production AI

Startup kinds ship in `infra/lambda/hos-narrative/index.mjs`. Merging to **`main`** triggers **Deploy HOS narrative API**. The client probes `startup_health` on load; until deploy completes, the title screen warns and offline fallbacks apply. See `docs/startup-simulator-lambda-deploy.md`.
