#!/bin/bash -x

### Use container as a single headless chrome ###

if [ "$HEADLESS_CHROME_ONLY" == true ]; then
    google-chrome --no-sandbox --headless --remote-debugging-port=$HEADLESS_CHROME_PORT  &> /chrome.log &
    sleep 100000000
else
  ### Use container as OpenVidu recording module ###

  CONTAINER_WORKING_MODE=${CONTAINER_WORKING_MODE:-COMPOSED}

  if [[ "${CONTAINER_WORKING_MODE}" ==  "COMPOSED" ]]; then
    ./composed.sh
  elif [[ "${CONTAINER_WORKING_MODE}" == "COMPOSED_QUICK_START" ]]; then
    ./composed_quick_start.sh
  elif [[ "${CONTAINER_WORKING_MODE}" == "RTMP" ]]; then
    ./rtmp.sh
  fi

fi