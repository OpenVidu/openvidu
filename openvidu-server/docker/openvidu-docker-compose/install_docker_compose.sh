#!/usr/bin/env bash

# Create folder openvidu-docker-compose
mkdir openvidu-docker-compose

# Download necessaries files
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/.env \
     --output .env
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.override.yml \
     --output docker-compose.override.yml
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.yml \
     --output docker-compose.yml
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/openvidu-restart.sh \
    --output openvidu-restart.sh
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/readme.md \
    --output readme.md

# Add execution permissions
chmod +x openvidu-restart.sh

# Create own certificated folder
mkdir openvidu-docker-compose/owncert

# Ready to use
printf "\n========================================"
printf "\nOpenvidu CE has successfully installed."
printf '\nNow run "./openvidu-restart.sh" for setup. Check "readme.md" for more details.\n\n'
exit 0
