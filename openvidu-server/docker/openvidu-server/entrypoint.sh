#!/bin/bash

printf "\n"
printf "\n  ======================================="
printf "\n  =           LAUNCH JAVA               ="
printf "\n  ======================================="
printf "\n"

if [ ! -z "${JAVA_OPTIONS}" ]; then
    printf "\n  Using java options: %s" "${JAVA_OPTIONS}"
fi

java ${JAVA_OPTIONS:-} -jar openvidu-server.jar
