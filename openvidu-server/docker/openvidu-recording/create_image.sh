#!/bin/bash -x

CHROME_VERSION=$1 # https://www.ubuntuupdates.org/package_logs?noppa=&page=1&type=ppas&vals=8#
TAG=$2

if [[ ! -z $CHROME_VERSION && ! -z $TAG ]]; then
    docker build --rm --pull --no-cache --build-arg CHROME_VERSION="$CHROME_VERSION" -t openvidu/openvidu-recording:$TAG .
else
    echo "Error: You need to specify a Chrome version as first argument and a docker tag as second argument"
    echo "./create_image.sh 110.0.5481.177-1 2.26.0"
    echo "You can obtain a valid Chrome version from https://www.ubuntuupdates.org/package_logs?noppa=&page=1&type=ppas&vals=8#"
fi
