# Startup Simulator — AI integration smoke

Use before or after deploying **`infra/lambda/hos-narrative/index.mjs`** with Startup kinds.

## Environment

Set either:

- `HOS_NARRATIVE_API_URL` — same secret as site build (POST URL, no trailing slash)
- `STARTUP_SIM_NARRATIVE_URL` — override for a staging endpoint

## Commands

From repo root:

```bash
# CI-safe: startup_health only (no OpenAI calls)
npm run smoke:startup-sim-ai

# Release check: every Startup kind (uses OpenAI — costs tokens)
node scripts/startup-sim-ai-smoke.mjs --full
```

If no URL is set, the script exits **0** with `SKIP` (local dev and PR CI without secrets).

## Kinds exercised (`--full`)

| Kind | Game feature |
|------|----------------|
| `startup_health` | Title-screen probe |
| `startup_xc_interview_score` | XC batch application |
| `startup_news_month` | Monthly news feed |
| `startup_social_reactions` | ProNet / Chirp reactions |
| `startup_advisor_chat` | Advisor tab |
| `startup_ipo_press` | IPO day headline |

## Manual checklist (optional)

1. Title screen shows **AI narrative connected** (not “unreachable”).
2. Reach XC, submit interview — AI feedback or clear fallback.
3. Close a month — news tab shows multiple articles.
4. Post on social — comments/likes update.
5. Advisor — reply to a question.
6. File IPO — press headline on public screen.

See also [startup-simulator-lambda-deploy.md](./startup-simulator-lambda-deploy.md).
