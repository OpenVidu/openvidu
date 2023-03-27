#!/bin/bash
set -eu -o pipefail

# DISPLAY variable is used by Selenium to know which X server to use
export DISPLAY_NUM=99
export DISPLAY=":${DISPLAY_NUM}"

# Wait for Xvfb to be ready. If not ready after 2 seconds, try next display
while ! xdpyinfo -display "${DISPLAY}" >/dev/null 2>&1; do
  DISPLAY_NUM=$((DISPLAY_NUM+1))
  DISPLAY=":${DISPLAY_NUM}"
  echo "Trying to launch XVFB on display ${DISPLAY}..."
  /usr/bin/Xvfb "${DISPLAY}" -screen 0 1280x720x16 &
  sleep 2s
done

echo "Running tests... Please wait..."

python3 main.py "$@"