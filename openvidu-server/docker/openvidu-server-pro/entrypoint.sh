#!/bin/bash

# Wait for kibana
if [ ! -z "${WAIT_KIBANA_URL}" ]; then 
  while true
  do
    HTTP_STATUS=$(curl -s -o /dev/null -I -w "%{http_code}" ${WAIT_KIBANA_URL})
    if [ "$HTTP_STATUS" == "200" ]; then
      break
    fi
    sleep 1
  done
fi

java -jar openvidu-server.jar
