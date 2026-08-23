#!/usr/bin/env bash

set -Eeuo pipefail

# deployment script run by SSM agent on EC2 instance
usage() {
  cat <<'EOF'
Usage: deploy-ec2.sh --sha SHA --region REGION --registry REGISTRY \
  --backend-repository NAME --frontend-repository NAME --production-url URL
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

# values will be filled by SSM command in run-ssm-deploy.sh
DEPLOY_SHA=""
AWS_REGION=""
ECR_REGISTRY=""
BACKEND_ECR_REPOSITORY=""
FRONTEND_ECR_REPOSITORY=""
PRODUCTION_URL=""

while (( $# > 0 )); do
  case "$1" in
    --sha) DEPLOY_SHA="${2:-}"; shift 2 ;;
    --region) AWS_REGION="${2:-}"; shift 2 ;;
    --registry) ECR_REGISTRY="${2:-}"; shift 2 ;;
    --backend-repository) BACKEND_ECR_REPOSITORY="${2:-}"; shift 2 ;;
    --frontend-repository) FRONTEND_ECR_REPOSITORY="${2:-}"; shift 2 ;;
    --production-url) PRODUCTION_URL="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; die "unknown argument: $1" ;;
  esac
done

[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || die "--sha must be a full lowercase Git commit SHA"
[[ -n "$AWS_REGION" ]] || die "--region is required"
[[ "$ECR_REGISTRY" =~ ^[0-9]+\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com$ ]] || die "invalid ECR registry"
[[ "$BACKEND_ECR_REPOSITORY" =~ ^[a-z0-9._/-]+$ ]] || die "invalid backend repository name"
[[ "$FRONTEND_ECR_REPOSITORY" =~ ^[a-z0-9._/-]+$ ]] || die "invalid frontend repository name"
[[ "$PRODUCTION_URL" =~ ^https://[^/]+/?$ ]] || die "--production-url must be an HTTPS origin"

for command in aws curl docker git; do
  command -v "$command" >/dev/null || die "$command is not installed"
done
docker compose version >/dev/null || die "Docker Compose v2 is not installed"

REPOSITORY_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || die "run this script from the deployment checkout"
cd "$REPOSITORY_ROOT"

[[ -f .env ]] || die "$REPOSITORY_ROOT/.env is missing"
[[ -d certbot/conf ]] || die "$REPOSITORY_ROOT/certbot/conf is missing"
git diff --quiet && git diff --cached --quiet || die "deployment checkout has uncommitted tracked changes"

STATE_DIRECTORY="$REPOSITORY_ROOT/.deploy"
STATE_FILE="$STATE_DIRECTORY/current-sha"
PREVIOUS_SHA=""
if [[ -f "$STATE_FILE" ]]; then
  PREVIOUS_SHA=$(<"$STATE_FILE")
  [[ "$PREVIOUS_SHA" =~ ^[0-9a-f]{40}$ ]] || die "deployment state contains an invalid SHA"
fi

compose() {
  ECR_REGISTRY="$ECR_REGISTRY" \
  BACKEND_ECR_REPOSITORY="$BACKEND_ECR_REPOSITORY" \
  FRONTEND_ECR_REPOSITORY="$FRONTEND_ECR_REPOSITORY" \
  IMAGE_TAG="$1" \
    docker compose --env-file .env -f docker-compose.prod.yml "${@:2}"
}

wait_for_service_health() {
  local attempt container_id health service
  for service in postgres redis backend nginx; do
    container_id=$(compose "$1" ps -q "$service")
    [[ -n "$container_id" ]] || return 1

    for attempt in {1..36}; do
      health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
      if [[ "$health" == "healthy" || "$health" == "running" ]]; then
        break
      fi
      [[ "$health" != "unhealthy" && "$health" != "exited" && "$health" != "dead" ]] || return 1
      sleep 5
    done
    [[ "$health" == "healthy" || "$health" == "running" ]] || return 1
  done
}

verify_release() {
  local attempt
  wait_for_service_health "$1" || return 1
  for attempt in {1..12}; do
    if curl --fail --silent --show-error --max-time 10 "${PRODUCTION_URL%/}/health" >/dev/null && \
       curl --fail --silent --show-error --max-time 10 "${PRODUCTION_URL%/}/" >/dev/null; then
      return 0
    fi
    sleep 5
  done
  return 1
}

activate_release() {
  local sha=$1
  git checkout --detach "$sha" || return 1
  [[ -f docker-compose.prod.yml ]] || die "commit $sha has no production Compose file"
  compose "$sha" pull backend nginx || return 1
  compose "$sha" up -d --remove-orphans || return 1
  verify_release "$sha"
}

echo "Fetching commit $DEPLOY_SHA"
git fetch --prune origin main
git cat-file -e "$DEPLOY_SHA^{commit}" 2>/dev/null || die "commit $DEPLOY_SHA was not fetched from origin/main"
git merge-base --is-ancestor "$DEPLOY_SHA" origin/main || die "commit $DEPLOY_SHA is not part of origin/main"

echo "Authenticating Docker to $ECR_REGISTRY"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "Deploying $DEPLOY_SHA"
if activate_release "$DEPLOY_SHA"; then
  mkdir -p "$STATE_DIRECTORY"
  printf '%s\n' "$DEPLOY_SHA" > "$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
  echo "Deployment $DEPLOY_SHA is healthy"
  exit 0
fi

echo "Deployment $DEPLOY_SHA failed health checks" >&2
compose "$DEPLOY_SHA" ps >&2 || true
compose "$DEPLOY_SHA" logs --tail 100 backend nginx >&2 || true

if [[ -z "$PREVIOUS_SHA" || "$PREVIOUS_SHA" == "$DEPLOY_SHA" ]]; then
  die "no previous release is available for automatic rollback"
fi

echo "Rolling back to $PREVIOUS_SHA" >&2
if activate_release "$PREVIOUS_SHA"; then
  echo "Rollback to $PREVIOUS_SHA succeeded" >&2
  exit 1
fi

compose "$PREVIOUS_SHA" ps >&2 || true
compose "$PREVIOUS_SHA" logs --tail 100 backend nginx >&2 || true
die "rollback to $PREVIOUS_SHA also failed"
