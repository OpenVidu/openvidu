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

    cp ../utils/discover_my_public_ip.sh ./discover_my_public_ip.sh
    cp ../utils/coturn-shared-key.template ./coturn-shared-key.template

    docker build --pull --no-cache --rm=true -t openvidu/openvidu-server:$VERSION .

    rm ./openvidu-server-*.jar
    rm ./discover_my_public_ip.sh
    rm ./coturn-shared-key.template
else
    echo "Error: You need to specify a version as first argument"
fi
