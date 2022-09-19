#!/bin/bash
VERSION=$1
if [[ ! -z $VERSION ]]; then
    cp ../../target/openvidu-server-*.jar ./openvidu-server.jar
    docker build --pull --no-cache --rm=true -t openvidu/openvidu-dev:$VERSION .
    rm ./openvidu-server.jar
else
    echo "Error: You need to specify a version as first argument"
fi