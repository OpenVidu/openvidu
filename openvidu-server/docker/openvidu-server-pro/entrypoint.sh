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

# Wait for Openvidu Media Nodes
if [ ! -z "${OPENVIDU_PRO_CLUSTER_MEDIA_NODES_IPS}" ]; then 
  printf "\n"
  printf "\n  ======================================="
  printf "\n  =          WAIT MEDIA NODES           ="
  printf "\n  ======================================="
  printf "\n"
  
  IFS=','
  for IP_MEDIANODE in $(echo "${OPENVIDU_PRO_CLUSTER_MEDIA_NODES_IPS}" | sed -e 's/\[//g' -e 's/\]//g' -e 's/"//g' | tr -d '[:space:]')
  do
    while true
    do
      HTTP_STATUS="$(curl \
                        --silent \
                        --no-buffer \
                        --connect-timeout 2 \
                        --write-out '%{http_code}' \
                        --header "Connection: Upgrade" \
                        --header "Upgrade: websocket" \
                        --header "Host: 127.0.0.1:8888" \
                        --header "Origin: 127.0.0.1" \
                        http://${IP_MEDIANODE}:8888/kurento)"

      printf "\n  Waiting for Media Node with IP: '%s'..." "${IP_MEDIANODE}"

      if [ "$HTTP_STATUS" == "500" ]; then
        printf "\n  ==== Media Node '%s' is ready ====" "${IP_MEDIANODE}"
        break
      fi

      sleep 1
    done
  done
fi

# Launch Openvidu Pro
printf "\n"
printf "\n  ======================================="
printf "\n  =           LAUNCH JAVA               ="
printf "\n  ======================================="
printf "\n"

if [ ! -z "${JAVA_OPTIONS}" ]; then
    printf "\n  Using java options: %s" "${JAVA_OPTIONS}"
fi

java ${JAVA_OPTIONS:-} -jar openvidu-server.jar
