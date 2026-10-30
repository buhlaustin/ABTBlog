#!/usr/bin/env bash
# Deploy HOS OpenAI narrative Lambda + Secrets Manager stack, then upload function code.
# Requires AWS CLI v2 and credentials (e.g. temporary IAM keys in AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK_NAME="${HOS_NARRATIVE_STACK_NAME:-austinbuhltech-hos-narrative}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
TEMPLATE="$ROOT/infra/cloudformation/hos-narrative-api.yaml"
LAMBDA_DIR="$ROOT/infra/lambda/hos-narrative"
ZIP="$ROOT/infra/lambda/hos-narrative.zip"

export AWS_REGION="$REGION"

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI not found. Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
  exit 1
fi

echo "Using region: $AWS_REGION"
aws sts get-caller-identity >/dev/null

echo "Deploying CloudFormation stack: $STACK_NAME"
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  ${HOS_ALLOWED_ORIGINS:+--parameter-overrides "AllowedOrigins=$HOS_ALLOWED_ORIGINS"}

SECRET_NAME="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='OpenAISecretName'].OutputValue" --output text)"
FUNC_NAME="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='NarrativeFunctionName'].OutputValue" --output text)"
API_URL="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='NarrativeApiUrl'].OutputValue" --output text)"

if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  echo "Updating Secrets Manager secret: $SECRET_NAME"
  if [[ "$OPENAI_API_KEY" == sk-* ]]; then
    aws secretsmanager put-secret-value \
      --secret-id "$SECRET_NAME" \
      --secret-string "$OPENAI_API_KEY"
  else
    aws secretsmanager put-secret-value \
      --secret-id "$SECRET_NAME" \
      --secret-string "{\"OPENAI_API_KEY\":\"$OPENAI_API_KEY\"}"
  fi
else
  echo "OPENAI_API_KEY not set in shell — skip secret update."
  echo "After deploy, run:"
  echo "  aws secretsmanager put-secret-value --secret-id $SECRET_NAME --secret-string 'sk-...'"
fi

echo "Building Lambda package..."
rm -f "$ZIP"
(
  cd "$LAMBDA_DIR"
  npm ci --omit=dev 2>/dev/null || npm install --omit=dev
  zip -qr "$ZIP" index.mjs node_modules
)

echo "Uploading Lambda code: $FUNC_NAME"
aws lambda update-function-code \
  --function-name "$FUNC_NAME" \
  --zip-file "fileb://$ZIP" \
  --no-cli-pager >/dev/null

aws lambda wait function-updated --function-name "$FUNC_NAME"

echo ""
echo "Done."
echo "  Narrative API URL: $API_URL"
echo "  GitHub Actions: add repository secret HOS_NARRATIVE_API_URL=$API_URL"
echo "  Local build test: HOS_NARRATIVE_API_URL=$API_URL npm run prebuild"
