#!/bin/bash
set -ex

missing_vars=()

required_env_vars=(
  "CONTEXT_PATH"
  "URL"
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

docker compose down -v --remove-orphans

# We need to do this separately (using -d) so that testbench exits with the correct code
# and we're not waiting on services that are long running
docker compose up -d tunnel mailserver

# docker compose wait tunnel - `docker wait tunnel` doesn't work for some reason.
# Because it doesn't work, I removed the healthcheck from docker-compose.yml.
max_attempts=10
attempt=1
until curl -sf http://localhost:4300/urls >/dev/null; do
  if [ $attempt -ge $max_attempts ]; then
    echo "Tunnel error"
    exit 1
  fi
  sleep 1
  attempt=$((attempt + 1))
done

# We're good to go once tunnels are ready because the tunnels service
# won't start until the other services are ready.
docker compose run --rm testbench