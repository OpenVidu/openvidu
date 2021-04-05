#!/bin/bash -x

# eg: $ ./create_image.sh ubuntu-20-04 86.0.4240.193-1 2.16.0
OPENVIDU_RECORDING_UBUNTU_VERSION=$1
OPENVIDU_RECORDING_CHROME_VERSION=$2 # https://www.ubuntuupdates.org/package_logs?noppa=&page=1&type=ppas&vals=8#
OPENVIDU_RECORDING_DOCKER_TAG=$3
docker build --rm --pull --no-cache --build-arg CHROME_VERSION="$OPENVIDU_RECORDING_CHROME_VERSION" \
    -f $OPENVIDU_RECORDING_UBUNTU_VERSION.Dockerfile \
    -t openvidu/openvidu-recording:$OPENVIDU_RECORDING_DOCKER_TAG .