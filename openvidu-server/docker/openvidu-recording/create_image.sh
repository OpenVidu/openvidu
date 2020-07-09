#!/bin/bash -x
OPENVIDU_RECORDING_UBUNTU_VERSION=$1
OPENVIDU_RECORDING_CHROME_VERSION=$2 # https://www.ubuntuupdates.org/package_logs?noppa=&page=1&type=ppas&vals=8#
OPENVIDU_RECORDING_DOCKER_TAG=$3
docker build --rm --build-arg CHROME_VERSION="$OPENVIDU_RECORDING_CHROME_VERSION" \
    -f $OPENVIDU_RECORDING_UBUNTU_VERSION.Dockerfile \
    -t openvidu/openvidu-recording:$OPENVIDU_RECORDING_DOCKER_TAG .