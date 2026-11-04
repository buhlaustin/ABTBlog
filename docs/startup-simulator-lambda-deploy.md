# Startup Simulator narrative kinds (deploy separately)

**Phase 7 ship goal:** live AI for Startup Simulator (see [startup-simulator-plan.md](./startup-simulator-plan.md) — Phase 7). Until this deploy lands, the game uses offline fallbacks only.

The static **Startup Simulator** client calls these `kind` values on the shared narrative API:

- `startup_xc_interview_score`
- `startup_news_month`
- `startup_social_reactions`
- `startup_advisor_chat`
- `startup_ipo_press`

The game works **without** them (offline fallbacks). Enable live AI by deploying the Lambda code that includes Startup kinds.

## When you are ready

1. Replace `index.mjs` with the prepared bundle:

   ```bash
   cp docs/startup-simulator-hos-narrative-index.mjs infra/lambda/hos-narrative/index.mjs
   ```

2. Merge to `main` **or** run the **Deploy HOS narrative API** workflow manually (`workflow_dispatch`).

Pushing only `infra/lambda/hos-narrative/**` changes to `main` triggers [`.github/workflows/deploy-hos-narrative-api.yml`](../../.github/workflows/deploy-hos-narrative-api.yml) automatically.

## Game-only merge

Merging Startup Simulator under `work/startup-sim/` does **not** deploy Lambda. Only changes to `infra/lambda/hos-narrative/index.mjs` (or the CloudFormation template) on `main` trigger deploy — not docs-only bundles.
