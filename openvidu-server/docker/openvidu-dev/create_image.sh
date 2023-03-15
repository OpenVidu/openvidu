#!/bin/bash
VERSION=$1
if [[ ! -z $VERSION ]]; then

    if [[ ! -f "./openvidu-server-*.jar" ]]; then
        cp ../../target/openvidu-server-*.jar .
    fi
    if [[ ! -f "./openvidu-server-*.jar" ]]; then
        echo "Error: openvidu-server JAR not found"
        exit 1
    fi

    docker build --pull --no-cache --rm=true -t openvidu/openvidu-dev:$VERSION .
    rm ./openvidu-server.jar
else
    echo "Error: You need to specify a version as first argument"
fi
