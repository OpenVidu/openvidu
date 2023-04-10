#!/bin/bash -x

TAG=$1

if [[ -n $TAG ]]; then
    docker build --rm --pull --no-cache -t "openvidu/openvidu-recording:$TAG" .
else
    echo "Error: You need to specify a docker tag as second argument"
    echo "./create_image.sh 2.26.0"
fi
