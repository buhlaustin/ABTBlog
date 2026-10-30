# Deploy to AWS (S3 + CloudFront)

This site builds to static files in `out/` (`output: "export"`).

## One-time infrastructure

1. Request an **ACM certificate** in **us-east-1** for `austinbuhltech.com` (and `www` if you use it). Validate via DNS in your existing Route 53 hosted zone.
2. Deploy the stack:

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/static-site.yaml \
  --stack-name austinbuhltech-site \
  --parameter-overrides \
    SiteDomainName=austinbuhltech.com \
    AcmCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/UUID \
    HostedZoneId=YOUR_HOSTED_ZONE_ID \
  --capabilities CAPABILITY_IAM
```

3. Note stack outputs: **BucketName**, **DistributionId**.

## GitHub Actions secrets

| Secret | Purpose |
|--------|---------|
| `AWS_ROLE_ARN` | IAM role for OIDC (recommended) |
| `AWS_S3_BUCKET` | Bucket from stack output |
| `AWS_CLOUDFRONT_ID` | Distribution ID from stack output |

Alternatively use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` on an IAM user with `s3:PutObject`, `cloudfront:CreateInvalidation`.

Optional **HOS OpenAI narration**: deploy the Lambda + Secrets Manager stack and set GitHub secret `HOS_NARRATIVE_API_URL` — see [hos-openai-aws.md](hos-openai-aws.md).

## Manual deploy

```bash
npm ci
npm run build
aws s3 sync out/ s3://YOUR_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## Local preview of static export

```bash
npm run build
npx serve out
```
