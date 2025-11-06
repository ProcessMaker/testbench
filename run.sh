#!/bin/sh
set -e
export SITE_NAME=COM2

npm run get-token

npm run update-server -- --script=configure-email

npx playwright test test-script.spec.ts

npx playwright test test-abe.spec.ts