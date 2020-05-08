#!/bin/bash

# Wait for kibana
if [ ! -z "${WAIT_KIBANA_URL}" ]; then 
  printf "\n"
  printf "\n  ======================================="
  printf "\n  =            WAIT KIBANA              ="
  printf "\n  ======================================="
  printf "\n"

  while true
  do
    HTTP_STATUS=$(curl -s -o /dev/null -I -w "%{http_code}" "${WAIT_KIBANA_URL}")

    printf "\n  Waiting for kibana in '%s' URL..." "${WAIT_KIBANA_URL}"

    if [ "$HTTP_STATUS" == "200" ]; then
      printf "\n  ==== Kibana is Ready ===="
      break
    fi

    sleep 1
  done
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
