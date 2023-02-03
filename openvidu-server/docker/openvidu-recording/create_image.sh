#!/bin/bash -x

# eg: $ ./create_image.sh 109.0.5414.119-1 2.25.0
OPENVIDU_RECORDING_CHROME_VERSION=$1 # https://www.ubuntuupdates.org/package_logs?noppa=&page=1&type=ppas&vals=8#
OPENVIDU_RECORDING_DOCKER_TAG=$2
docker build --rm --pull --no-cache \
    --build-arg CHROME_VERSION="$OPENVIDU_RECORDING_CHROME_VERSION" \
    -t openvidu/openvidu-recording:$OPENVIDU_RECORDING_DOCKER_TAG .