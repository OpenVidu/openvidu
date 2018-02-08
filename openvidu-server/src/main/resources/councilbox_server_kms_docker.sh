#!/bin/bash

command=$(docker run -d -p 8443:8443 --name server-kms \
-v /var/run/docker.sock:/var/run/docker.sock \
-v /home/recordings:/home/recordings \
-e openvidu.recording=true \
-e openvidu.recording.path=/home/recordings \
-e openvidu.recording.free-access=true \
-e openvidu.secret=YOUR_SECRET \
-e openvidu.publicurl=https://217.182.136.130:8443/ \
--net="host" \
councilbox/server-kms:1.7.0)

echo $command