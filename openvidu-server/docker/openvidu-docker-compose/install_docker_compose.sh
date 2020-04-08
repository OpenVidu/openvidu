#!/usr/bin/env bash

DOCKER_COMPOSE_FOLDER=openvidu-docker-compose

# Create folder openvidu-docker-compose
mkdir ${DOCKER_COMPOSE_FOLDER}

# Download necessaries files
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/.env \
     --output ${DOCKER_COMPOSE_FOLDER}/.env
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.override.yml \
     --output ${DOCKER_COMPOSE_FOLDER}/docker-compose.override.yml
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.yml \
     --output ${DOCKER_COMPOSE_FOLDER}/docker-compose.yml
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/openvidu-restart.sh \
    --output ${DOCKER_COMPOSE_FOLDER}/openvidu-restart.sh
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/readme.md \
    --output ${DOCKER_COMPOSE_FOLDER}/readme.md

# Add execution permissions
chmod +x ${DOCKER_COMPOSE_FOLDER}/openvidu-restart.sh

# Create own certificated folder
mkdir ${DOCKER_COMPOSE_FOLDER}/owncert

# Ready to use
printf "\n========================================"
printf "\nOpenvidu CE has successfully installed."
printf '\nNow run "./openvidu-restart.sh" in folder "openvidu-docker-compose" for setup.'
printf '\n"Check "readme.md" in folder "openvidu-docker-compose" for more details.\n\n'
exit 0
