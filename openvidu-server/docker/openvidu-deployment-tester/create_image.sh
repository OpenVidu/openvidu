#!/bin/bash -x
VERSION=$1
if [[ ! -z $VERSION ]]; then
    docker build --pull --no-cache --rm=true -t "openvidu/openvidu-deployment-tester:${VERSION}" .
else
    echo "Error: You need to specify a version as first argument"
fi