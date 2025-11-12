#!/bin/bash
set -ex

missing_vars=()

required_env_vars=(
  "CONTEXT_PATH"
  "GITHUB_TOKEN"
  "MULTITENANCY"
  "INSTANCE"
  "SITE_NAME"
  "INSTANCE_PASSWORD"
)

for var in "${required_env_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ "${#missing_vars[@]}" -ne 0 ]; then
  echo "❌ Error: The following required environment variables are not set:"
  for var in "${missing_vars[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

export USER_GROUP=$(id -u):$(id -g)
export TCP_TUNNELS="mailserver:587 mailserver:993"
export TUNNEL_SERVICE_URL="http://tunnel"

mkdir -p services/dms
mkdir -p services/certs
rm -rf services/dms/* || true
rm -rf services/certs/* || true

docker compose down -v --remove-orphans
docker compose run generate-certs
docker compose up mailserver testbench tunnel --abort-on-container-exit --exit-code-from testbench
