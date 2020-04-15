#!/bin/bash
docker build -t openvidu/openvidu-server-pro --build-arg OPENVIDU_VERSION=$1 .
