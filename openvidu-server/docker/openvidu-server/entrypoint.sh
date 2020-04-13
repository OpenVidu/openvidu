#!/bin/bash

if [ ! -z "${JAVA_OPTIONS}" ]; then
    echo "Using java options: ${JAVA_OPTIONS}"
fi

java ${JAVA_OPTIONS:-} -jar openvidu-server.jar
