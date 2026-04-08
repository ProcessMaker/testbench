#!/bin/sh

# if TCP_TUNNELS is not set, exit with error
if [ -z "$TCP_TUNNELS" ]; then
    echo "TCP_TUNNELS is not set"
    exit 1
fi

# Track PIDs of all tunnel processes
PIDS=""

# Cleanup function to kill all tunnel processes
cleanup() {
    if [ -n "$PIDS" ]; then
        for pid in $PIDS; do
            kill -INT "$pid" 2>/dev/null || true
        done
        # Wait a bit for graceful shutdown, then force kill
        sleep 1
        for pid in $PIDS; do
            kill -9 "$pid" 2>/dev/null || true
        done
    fi
    exit 1
}

# Trap SIGINT to cleanup all processes
trap cleanup INT

# Start debugger port counter
debugger_port=4300

# Start each tunnel in parallel
for tunnel in $TCP_TUNNELS; do
    sshpass -p foo ssh -p 443 \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        -o ExitOnForwardFailure=yes \
        -R0:"$tunnel" \
        -L0.0.0.0:"$debugger_port":localhost:4300 \
        tcp@free.pinggy.io &
    
    pid=$!
    PIDS="$PIDS $pid"
    debugger_port=$((debugger_port + 1))
done

# Wait for tunnels to be established
echo "⏳ Waiting for tunnels to be established..."
sleep 3

# Verify each tunnel port is ready by checking the web server
debugger_port=4300
for tunnel in $TCP_TUNNELS; do
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://localhost:$debugger_port/urls" > /dev/null 2>&1; then
            echo "✅ Tunnel port $debugger_port is ready for $tunnel"
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Tunnel port $debugger_port failed to become ready for $tunnel"
        cleanup
    fi
    debugger_port=$((debugger_port + 1))
done

echo "✅ All tunnels are ready"

# Wait for any process to exit
# Poll each PID to check if it's still running
while true; do
    for pid in $PIDS; do
        if ! kill -0 "$pid" 2>/dev/null; then
            # Process has exited, get its exit code
            wait "$pid" 2>/dev/null
            exit_code=$?
            # Any process exited, cleanup and exit with error
            cleanup
        fi
    done
    # Sleep briefly before checking again
    sleep 1
done
