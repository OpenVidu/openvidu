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

if [ ! -z "${JAVA_OPTIONS}" ]; then
    echo "Using java options: ${JAVA_OPTIONS}"
fi

java ${JAVA_OPTIONS:-} -jar openvidu-server.jar
