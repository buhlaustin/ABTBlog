# HOS OpenAI narration (Lambda + ClassQuip secret)

House of Strategy is **static** (S3 + CloudFront). The OpenAI key stays in your existing **`prod/ClassQuip`** Secrets Manager bundle (`OPENAI_API_KEY` field). A small **Lambda Function URL** reads that secret and calls OpenAI. The browser only gets the Function URL at build time.

**This repo does not create, update, or delete Secrets Manager values.**

## Architecture

1. **Secrets Manager** — existing `prod/ClassQuip` JSON (same as ClassQuip production).
2. **Lambda** — `infra/lambda/hos-narrative/` — `GetSecretValue` read-only, origin allowlist, rate limit.
3. **Build** — GitHub secret `HOS_NARRATIVE_API_URL` → `scripts/inject-hos-config.mjs` → `work/hos/modules/hos-config.js`.

## Deploy Lambda (one-time or on code changes)

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1

chmod +x scripts/deploy-hos-narrative-api.sh
./scripts/deploy-hos-narrative-api.sh
```

Optional override: `OPENAI_SECRET_ARN` if the ClassQuip secret ARN changes.

## GitHub Actions secrets

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Deploy site + optional **Deploy HOS narrative API** workflow |
| `AWS_S3_BUCKET` / `AWS_CLOUDFRONT_ID` | Static site |
| `HOS_NARRATIVE_API_URL` | Lambda Function URL from stack output — **not** the OpenAI key |

You do **not** need `OPENAI_API_KEY` in GitHub for HOS.

## Local test

```bash
export HOS_NARRATIVE_API_URL=https://....lambda-url.us-east-1.on.aws/
npm run prebuild
```

## Stack

CloudFormation stack name default: `austinbuhltech-hos-narrative`  
Template: `infra/cloudformation/hos-narrative-api.yaml`
