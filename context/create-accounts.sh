#!/bin/bash
# Recreates accounts formerly defined in context/postfix-accounts.cf (plaintext: password).
set -eu
cd "$(dirname "$0")"

MAILSERVER_CONTAINER="${MAILSERVER_CONTAINER:-mailserver}"

echo "Waiting for ${MAILSERVER_CONTAINER} to accept setup ..."
for _ in $(seq 1 120); do
  if docker exec "${MAILSERVER_CONTAINER}" setup help >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker exec "${MAILSERVER_CONTAINER}" setup help >/dev/null 2>&1; then
  echo "Timeout: ${MAILSERVER_CONTAINER} did not become ready for setup" >&2
  exit 1
fi

run_setup() {
  ./setup.sh -c "${MAILSERVER_CONTAINER}" "$@"
}

run_setup email add abe-imap@example.test password
run_setup email add sender@example.test password
run_setup email add receiver@example.test password
run_setup email add abe-imap-1@example.test password
run_setup email add sender-1@example.test password
run_setup email add receiver-1@example.test password
run_setup email add abe-imap-2@example.test password
run_setup email add sender-2@example.test password
run_setup email add receiver-2@example.test password
run_setup email add abe-imap-3@example.test password
run_setup email add sender-3@example.test password
run_setup email add receiver-3@example.test password
