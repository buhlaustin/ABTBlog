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

**Phase 7:** live AI, gameplay depth, meta, UX, polish, and ops (Playwright + AI smoke).

## Build & QA

- `npm run smoke:startup-sim` — headless task-pool and module checks (also runs in `prebuild`)
- `npm run e2e:startup-sim` — Playwright: new game → task → reload → continue (after `npm ci` + `npx playwright install chromium`)
- `npm run smoke:startup-sim-ai` — narrative `startup_health` when `HOS_NARRATIVE_API_URL` is set; see `docs/startup-simulator-ai-smoke.md`
- `npm run prebuild` — validates assets, smoke, copies to `public/play/`

## Saves

Progress saves automatically in your browser as you play. Use **Continue saved game** on the title screen to resume. **New game** replaces the save when you found a new company.

## Production AI

Startup kinds ship in `infra/lambda/hos-narrative/index.mjs`. Merging to **`main`** triggers **Deploy HOS narrative API**. The client probes `startup_health` on load; until deploy completes, the title screen warns and offline fallbacks apply. See `docs/startup-simulator-lambda-deploy.md`.
