#!/bin/bash
set -eu -o pipefail

# Launch XVFB
/usr/bin/Xvfb :99 -screen 0 1280x720x16 &

# Wait for XVFB
while ! xdpyinfo >/dev/null 2>&1
do
  sleep 0.50s
  echo "Waiting xvfb..."
done

echo "Running tests... Please wait..."

exec python3 "$@"
