#!/bin/sh
SITE_NAME=CI \
URL=https://ci-d29c3b7c84.engk8s.processmaker.net \
USER_GROUP=$(id -u):$(id -g) \
INSTANCE_PASSWORD=qastm2026 \
CONTEXT_PATH=/Users/nolan/src/testbench/context \
TCP_TUNNELS="mailserver:587 mailserver:993" \
./start.sh