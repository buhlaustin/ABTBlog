# HOS OpenAI narration (AWS Secrets Manager + Lambda)

House of Strategy stays a **static** site. The OpenAI API key lives in **AWS Secrets Manager**; a small **Lambda Function URL** calls OpenAI server-side. The browser only knows the public Function URL (injected at build time).

## Architecture

1. **Secrets Manager** — secret name default: `austinbuhltech/hos/openai-api-key` (plain `sk-...` or JSON `{"OPENAI_API_KEY":"sk-..."}`).
2. **Lambda** — `infra/lambda/hos-narrative/` reads the secret, rate-limits by IP, validates `Origin`, POST body `{ kind, context }`.
3. **Build** — `scripts/inject-hos-config.mjs` writes `work/hos/modules/hos-config.js` from `HOS_NARRATIVE_API_URL`.
4. **Game** — optional beats: `daily_beat` (social days), `host_line` (before live events), `week_recap` (after eviction). Falls back to local narration if the API is missing or errors.

## One-time deploy (with temporary IAM keys)

Export the **temporary AWS access keys** from the IAM user or role AWS gave you (same pair you use for S3 deploy is fine if it can create Lambda, IAM, and Secrets Manager):

```bash
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1

# Optional: set the OpenAI key in the same command as stack deploy
export OPENAI_API_KEY=sk-...

chmod +x scripts/deploy-hos-narrative-api.sh scripts/setup-openai-secret.sh
./scripts/deploy-hos-narrative-api.sh
```

The script prints **NarrativeApiUrl**. Add it to GitHub:

| Secret | Value |
|--------|--------|
| `HOS_NARRATIVE_API_URL` | Function URL from stack output (e.g. `https://....lambda-url.us-east-1.on.aws/`) |

If you skipped `OPENAI_API_KEY` during deploy, set the secret manually:

```bash
OPENAI_API_KEY=sk-... ./scripts/setup-openai-secret.sh
# or
aws secretsmanager put-secret-value \
  --secret-id austinbuhltech/hos/openai-api-key \
  --secret-string 'sk-...'
```

## GitHub Actions

- **Site deploy** (`.github/workflows/deploy.yml`) — add `HOS_NARRATIVE_API_URL` so `npm run prebuild` bakes the URL into the static HOS bundle.
- **API only** (`.github/workflows/deploy-hos-narrative-api.yml`) — workflow_dispatch to redeploy Lambda code/stack using the same AWS secrets.

Minimum IAM for the deploy user (in addition to S3/CloudFront):

- `cloudformation:*` (stack `austinbuhltech-hos-narrative`)
- `lambda:UpdateFunctionCode`, `lambda:GetFunction`
- `secretsmanager:CreateSecret`, `PutSecretValue`, `GetSecretValue`
- `iam:CreateRole`, `iam:PutRolePolicy`, `iam:PassRole` (CloudFormation creates the execution role)

## Local testing

```bash
# After deploy
export HOS_NARRATIVE_API_URL=https://your-function-url.lambda-url.us-east-1.on.aws/
npm run prebuild
npx serve public/work/hos   # or full site: npm run build && npx serve out
```

CORS allows `https://austinbuhltech.com` and `https://www.austinbuhltech.com`. For local file preview, use `npx serve` on `http://localhost:3000` and temporarily add that origin to stack parameter `AllowedOrigins` (redeploy stack).

## Rotating the OpenAI key

```bash
OPENAI_API_KEY=sk-new... ./scripts/setup-openai-secret.sh
```

No site redeploy required; Lambda reads the latest secret on cold start (warm containers cache until recycled).

## Cost / safety notes

- Function URL is public but origin-checked and rate-limited (not a substitute for auth if you expose other origins).
- Context sent to OpenAI excludes hidden alliance rosters; only aggregate counts and public-ish story lines.
- Model default: `gpt-4o-mini` (override CloudFormation parameter `OpenAIModel`).
