#!/bin/bash -x

### Use container as a single headless chrome ###

if [ "$HEADLESS_CHROME_ONLY" == true ]; then
    google-chrome --no-sandbox --headless --remote-debugging-port=$HEADLESS_CHROME_PORT  &> /chrome.log &
    sleep 100000000
else
  ### Use container as OpenVidu recording module ###

  RECORDING_TYPE=${RECORDING_TYPE:-COMPOSED}

  if [[ "${RECORDING_TYPE}" ==  "COMPOSED" ]]; then
    ./composed.sh
  elif [[ "${RECORDING_TYPE}" == "COMPOSED_QUICK_START" ]]; then
    ./composed_quick_start.sh
  fi

fi