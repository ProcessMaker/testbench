#!/bin/sh
set -e

# Exit if SITE_NAME is not set
if [ -z "$SITE_NAME" ]; then
    echo "SITE_NAME is not set"
    exit 1
fi

npm run ci-sites

npm run get-token

npm run update-server -- --script=configure-email

npx playwright test test-script.spec.ts

npx playwright test test-abe.spec.ts