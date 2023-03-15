#!/bin/bash
VERSION=$1
if [[ ! -z $VERSION ]]; then

    if ! ls ./openvidu-server-*.jar 1>/dev/null 2>&1; then
        cp ../../target/openvidu-server-*.jar .
        if ! ls ./openvidu-server-*.jar 1>/dev/null 2>&1; then
            echo "Error: openvidu-server JAR not found"
            exit 1
        fi
    fi

    docker build --pull --no-cache --rm=true -t openvidu/openvidu-dev:$VERSION .
    rm ./openvidu-server-*.jar
else
    echo "Error: You need to specify a version as first argument"
fi
