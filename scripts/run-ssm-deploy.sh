#!/usr/bin/env bash

set -Eeuo pipefail

# from github variables + variables defined in deploy.yml
required_variables=(
  AWS_REGION
  EC2_INSTANCE_ID
  EC2_DEPLOY_USER
  EC2_DEPLOY_PATH
  ECR_REGISTRY # from ECR login step in deploy.yml
  BACKEND_ECR_REPOSITORY
  FRONTEND_ECR_REPOSITORY
  PRODUCTION_URL
  DEPLOY_SHA # commit being deployed
)

for variable in "${required_variables[@]}"; do
  [[ -n "${!variable:-}" ]] || { echo "ERROR: $variable is required" >&2; exit 1; }
done

# basic validation
[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "ERROR: DEPLOY_SHA must be a full lowercase Git SHA" >&2; exit 1; }
[[ "$EC2_INSTANCE_ID" =~ ^i-[0-9a-f]+$ ]] || { echo "ERROR: invalid EC2_INSTANCE_ID" >&2; exit 1; }
[[ "$EC2_DEPLOY_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo "ERROR: invalid EC2_DEPLOY_USER" >&2; exit 1; }
[[ "$EC2_DEPLOY_PATH" == /* ]] || { echo "ERROR: EC2_DEPLOY_PATH must be absolute" >&2; exit 1; }

# construct the command to run on EC2
script_object="${DEPLOY_SHA}:scripts/deploy-ec2.sh" # script to run on EC2
printf -v inner_command \
  'set -o pipefail; cd %q && git fetch --prune origin main && git merge-base --is-ancestor %q origin/main && git show %q | bash -s -- --sha %q --region %q --registry %q --backend-repository %q --frontend-repository %q --production-url %q' \
  "$EC2_DEPLOY_PATH" \
  "$DEPLOY_SHA" \
  "$script_object" \
  "$DEPLOY_SHA" \
  "$AWS_REGION" \
  "$ECR_REGISTRY" \
  "$BACKEND_ECR_REPOSITORY" \
  "$FRONTEND_ECR_REPOSITORY" \
  "$PRODUCTION_URL"
printf -v remote_command 'sudo -u %q -H bash -lc %q' "$EC2_DEPLOY_USER" "$inner_command"

# AWS SSM command parameters (in JSON), with timeout
parameters=$(jq -cn --arg command "$remote_command" '{commands: [$command], executionTimeout: ["1200"]}')
command_id=$(aws ssm send-command \
  --region "$AWS_REGION" \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "Deploy squish $DEPLOY_SHA" \
  --parameters "$parameters" \
  --query Command.CommandId \
  --output text)

echo "SSM command: $command_id"

# poll for SSM command to report result
invocation=""
status="Pending"
for _ in {1..240}; do
  if invocation=$(aws ssm get-command-invocation \
    --region "$AWS_REGION" \
    --command-id "$command_id" \
    --instance-id "$EC2_INSTANCE_ID" \
    --output json 2>/dev/null); then
    status=$(jq -r '.Status' <<<"$invocation")
    case "$status" in
      Success|Cancelled|TimedOut|Failed|Cancelling) break ;;
    esac
  fi
  sleep 5
done

if [[ -z "$invocation" ]]; then
  echo "ERROR: no SSM invocation result was returned" >&2
  exit 1
fi

echo "--- remote stdout ---"
jq -r '.StandardOutputContent // ""' <<<"$invocation"
echo "--- remote stderr ---" >&2
jq -r '.StandardErrorContent // ""' <<<"$invocation" >&2

if [[ "$status" != "Success" ]]; then
  echo "ERROR: deployment command finished with status $status" >&2
  exit 1
fi
