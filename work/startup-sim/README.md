# Startup Simulator

Hosted startup tycoon game (Career + Sandbox modes). Play on the site at `/work/startup-sim/`. Design plan: [`docs/startup-simulator-plan.md`](../../docs/startup-simulator-plan.md) (internal).

## Local play

```bash
npm run copy-work
python3 -m http.server 8080
```

Open `http://localhost:8080/play/startup-sim/index.html` (after copy) or serve this folder directly.

## Status

**Shipped (Phases 0–6):** core loop, staff/fundraising, XC/hubs, AI news/social/advisor, IPO endgame, CC0 stage icons, tutorials, a11y/mobile polish.

**Build:** `npm run prebuild` validates `assets/manifest.json` paths before copy to `public/play/`.
