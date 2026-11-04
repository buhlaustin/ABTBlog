# Asset provenance

All shipped art/audio must be listed in `assets/manifest.json` with license and source URL.

Curated sources (prefer CC0 / CC-BY with attribution):

- Kenney.nl — UI packs
- Wikimedia Commons — photography
- OpenGameArt.org — per-file license check

Do not commit generative “placeholder slop” as final assets.

## Shipped (Phase 6)

Stage HUD icons under `assets/icons/*.svg` — simple vector art authored for this game, **CC0-1.0**, listed in `manifest.json`. Replace or extend via the manifest; run `node scripts/validate-startup-sim-assets.mjs` before release builds.

## Shipped (Phase 7 — content & polish)

Wide **stage backdrops** (`1200×280`, layered gradients, skylines, hub palettes) under `assets/backgrounds/*-bg.svg` and **hub skylines** under `assets/backgrounds/hub-*.svg` — authored SVG (CC0-1.0), `manifest.json` v3, applied via `Assets.js` (`gameBackdropUrl`).

**Audio** uses Web Audio sine tones in `modules/Audio.js` (no binary assets); off by default, toggled in the game footer.
