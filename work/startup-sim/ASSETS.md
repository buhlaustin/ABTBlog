# Asset provenance

All shipped art must be listed in `assets/manifest.json` with license and source URL.

## Stage & hub photography (manifest v4)

**Backdrops** (`assets/backgrounds/*.jpg`) and **HUD icons** (`assets/icons/*.jpg`) are **original game art** generated for Startup Simulator — not stock libraries, not scraped from the web, not CC0 packs. License: **Proprietary (game art)** for use in this project.

Replace or extend only by adding new manifest entries and updating paths in `modules/Assets.js`. Run `node scripts/validate-startup-sim-assets.mjs` before release builds.

## Audio

**Audio** uses Web Audio sine tones in `modules/Audio.js` (no binary assets); off by default, toggled in the game footer.
