#!/usr/bin/env bash
# Set or rotate the OpenAI API key in Secrets Manager (no stack deploy).
set -euo pipefail

SECRET_NAME="${1:-austinbuhltech/hos/openai-api-key}"
REGION="${AWS_REGION:-us-east-1}"

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "Usage: OPENAI_API_KEY=sk-... $0 [secret-name]"
  exit 1
fi

export AWS_REGION="$REGION"
aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --secret-string "$OPENAI_API_KEY"

echo "Updated secret: $SECRET_NAME (region $AWS_REGION)"
