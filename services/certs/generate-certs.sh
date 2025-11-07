#! /bin/sh
set -e

# Generate certs in a temporary directory inside the container
TEMP_DIR=/tmp/cert-gen
OUTPUT_DIR=/tmp/step-ca

# Create temp directory and ensure output directory exists
mkdir -p "$TEMP_DIR/demoCA"
mkdir -p "$OUTPUT_DIR"

# Generate certificates in temp directory
cd "$TEMP_DIR"

step certificate create "Smallstep Root CA" "demoCA/cacert.pem" "demoCA/cakey.pem" \
  --no-password --insecure \
  --profile root-ca \
  --not-before "2021-01-01T00:00:00+00:00" \
  --not-after "2031-01-01T00:00:00+00:00" \
  --san "example.test" \
  --san "mail.example.test" \
  --kty RSA --size 2048 --force

step certificate create "Smallstep Leaf" mail.example.test-cert.pem mail.example.test-key.pem \
  --no-password --insecure \
  --profile leaf \
  --ca "demoCA/cacert.pem" \
  --ca-key "demoCA/cakey.pem" \
  --not-before "2021-01-01T00:00:00+00:00" \
  --not-after "2031-01-01T00:00:00+00:00" \
  --san "example.test" \
  --san "mail.example.test" \
  --kty RSA --size 2048 --force

# Copy all generated files to the mounted volume
# Ensure output directory exists and has proper permissions
mkdir -p "$OUTPUT_DIR" 2>/dev/null || true
chmod 777 "$OUTPUT_DIR" 2>/dev/null || true

# Copy files with error handling
if cp -r demoCA "$OUTPUT_DIR/" 2>/dev/null; then
  echo "Successfully copied demoCA directory"
else
  echo "Warning: Failed to copy demoCA directory, trying with force..."
  cp -rf demoCA/* "$OUTPUT_DIR/demoCA/" 2>/dev/null || {
    echo "Error: Cannot write to $OUTPUT_DIR - check volume permissions"
    exit 1
  }
fi

cp mail.example.test-cert.pem "$OUTPUT_DIR/" 2>/dev/null || {
  echo "Error: Cannot write certificate file to $OUTPUT_DIR"
  exit 1
}

cp mail.example.test-key.pem "$OUTPUT_DIR/" 2>/dev/null || {
  echo "Error: Cannot write key file to $OUTPUT_DIR"
  exit 1
}

echo "All certificates generated and copied successfully"