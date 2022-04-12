#!/bin/bash
VERSION=$1
if [[ ! -z $VERSION ]]; then
    cp ../utils/discover_my_public_ip.sh ./discover_my_public_ip.sh
    cp ../utils/coturn-shared-key.template ./coturn-shared-key.template
    docker build --pull --no-cache --rm=true -t openvidu/openvidu-server-pro:$VERSION .
    rm ./discover_my_public_ip.sh
    rm ./coturn-shared-key.template
else
    echo "Error: You need to specify a version as first argument"
fi