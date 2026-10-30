#!/usr/bin/env bash
# Deploy HOS narrative Lambda (uses existing prod/ClassQuip secret — no secret writes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STACK_NAME="${HOS_NARRATIVE_STACK_NAME:-austinbuhltech-hos-narrative}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
TEMPLATE="$ROOT/infra/cloudformation/hos-narrative-api.yaml"
LAMBDA_DIR="$ROOT/infra/lambda/hos-narrative"
ZIP="$ROOT/infra/lambda/hos-narrative.zip"
DEFAULT_SECRET_ARN="${OPENAI_SECRET_ARN:-arn:aws:secretsmanager:us-east-1:177914733797:secret:prod/ClassQuip-vRZIoS}"

export AWS_REGION="$REGION"

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI not found."
  exit 1
fi

echo "Using region: $AWS_REGION"
aws sts get-caller-identity >/dev/null

PARAMS="OpenAISecretArn=$DEFAULT_SECRET_ARN"
if [[ -n "${HOS_ALLOWED_ORIGINS:-}" ]]; then
  PARAMS="$PARAMS AllowedOrigins=$HOS_ALLOWED_ORIGINS"
fi

echo "Deploying CloudFormation stack: $STACK_NAME (read-only access to existing secret)"
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides "$PARAMS"

FUNC_NAME="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='NarrativeFunctionName'].OutputValue" --output text)"
API_URL="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='NarrativeApiUrl'].OutputValue" --output text)"

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
echo "  GitHub Actions: set HOS_NARRATIVE_API_URL to the URL above (site build only)."
echo "  OpenAI key: reused from prod/ClassQuip (OPENAI_API_KEY) — not modified by this script."
