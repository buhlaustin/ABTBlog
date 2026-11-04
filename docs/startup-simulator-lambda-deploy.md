# Startup Simulator narrative kinds (deploy separately)

**Phase 7 ship goal:** live AI for Startup Simulator (see [startup-simulator-plan.md](./startup-simulator-plan.md) — Phase 7). Until this deploy lands, the game uses offline fallbacks only.

The static **Startup Simulator** client calls these `kind` values on the shared narrative API:

- `startup_xc_interview_score`
- `startup_news_month`
- `startup_social_reactions`
- `startup_advisor_chat`
- `startup_ipo_press`

The game works **without** them (offline fallbacks). Enable live AI by deploying the Lambda code that includes Startup kinds.

## Deploy

**Phase 7** includes Startup kinds in `infra/lambda/hos-narrative/index.mjs` (kept in sync with `docs/startup-simulator-hos-narrative-index.mjs`).

Merging that file to **`main`** triggers [`.github/workflows/deploy-hos-narrative-api.yml`](../../.github/workflows/deploy-hos-narrative-api.yml) automatically, or run **Deploy HOS narrative API** via `workflow_dispatch`.

After deploy, the game probes `startup_health` on load; the title screen shows **AI narrative connected** when the live Lambda responds.

## Client-only changes

Merging only `work/startup-sim/**` does **not** deploy Lambda. Production AI stays offline until `index.mjs` reaches `main`.
