#!/bin/bash

printf "\n"
printf "\n  ======================================="
printf "\n  =       LAUNCH OPENVIDU-SERVER        ="
printf "\n  ======================================="
printf "\n"

# Get coturn public ip
[[ -z "${COTURN_IP}" ]] && export COTURN_IP=auto-ipv4
if [[ "${COTURN_IP}" == "auto-ipv4" ]]; then
    COTURN_IP=$(/usr/local/bin/discover_my_public_ip.sh)
elif [[ "${COTURN_IP}" == "auto-ipv6" ]]; then
    COTURN_IP=$(/usr/local/bin/discover_my_public_ip.sh --ipv6)
fi

if [[ "${OV_CE_DEBUG_LEVEL}" == "DEBUG" ]]; then
    export LOGGING_LEVEL_IO_OPENVIDU_SERVER=DEBUG
fi

if [ ! -z "${JAVA_OPTIONS}" ]; then
    printf "\n  Using java options: %s" "${JAVA_OPTIONS}"
fi

java ${JAVA_OPTIONS:-} -jar openvidu-server.jar
