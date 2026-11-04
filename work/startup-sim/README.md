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

## Build & QA

- `npm run smoke:startup-sim` — headless task-pool and module checks (also runs in `prebuild`)
- `npm run prebuild` — validates assets, smoke, copies to `public/play/`

## Production AI (optional)

Redeploy the shared **`hos-narrative`** Lambda after prompt changes; the game uses offline fallbacks when the narrative URL is unavailable.
