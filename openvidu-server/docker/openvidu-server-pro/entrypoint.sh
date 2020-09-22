#!/bin/bash

# Wait for kibana
if [ ! -z "${WAIT_KIBANA_URL}" ]; then
  printf "\n"
  printf "\n  ======================================="
  printf "\n  =            WAIT KIBANA              ="
  printf "\n  ======================================="
  printf "\n"

  until $(curl --insecure --output /dev/null --silent --head --fail ${WAIT_KIBANA_URL})
  do 
    printf "\n  Waiting for kibana in '%s' URL..." "${WAIT_KIBANA_URL}"
    sleep 1
  done
  printf "\n  ==== Kibana is Ready ===="
fi

# Launch Openvidu Pro
printf "\n"
printf "\n  ======================================="
printf "\n  =       LAUNCH OPENVIDU-SERVER        ="
printf "\n  ======================================="
printf "\n"

if [ ! -z "${JAVA_OPTIONS}" ]; then
    printf "\n  Using java options: %s" "${JAVA_OPTIONS}"
fi

java ${JAVA_OPTIONS:-} -jar openvidu-server.jar
