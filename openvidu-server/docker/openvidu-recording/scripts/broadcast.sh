#!/bin/bash

# DEBUG MODE
DEBUG_MODE=${DEBUG_MODE:-false}
if [[ ${DEBUG_MODE} == true ]]; then
  DEBUG_CHROME_FLAGS="--enable-logging --v=1"
fi

{

  ### Variables ###

  BROADCAST_URL=${BROADCAST_URL}
  URL=${URL:-https://www.youtube.com/watch?v=JMuzlEQz3uo}
  RESOLUTION=${RESOLUTION:-1920x1080}
  FRAMERATE=${FRAMERATE:-25}
  WIDTH="$(cut -d'x' -f1 <<<$RESOLUTION)"
  HEIGHT="$(cut -d'x' -f2 <<<$RESOLUTION)"

  export BROADCAST_URL
  export URL
  export RESOLUTION
  export FRAMERATE
  export WIDTH
  export HEIGHT

  echo
  echo "============= Loaded Environment Variables ============="
  env
  echo "========================================================"
  echo

  ### Run headless Chrome ###

  source /headless-chrome.sh

  ### Run broadcast command ###

  eval "$BROADCAST_COMMAND"

} 2>&1 | tee -a /tmp/container.log

if [[ ${DEBUG_MODE} == "true" ]]; then
  mkdir -p /logs
  [[ -f /tmp/container.log ]] && cp /tmp/container.log /logs/$(date +%s) || echo "/tmp/container.log not found"
  sudo chmod -R 777 /logs/$(date +%s)
fi
