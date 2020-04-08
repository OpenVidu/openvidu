#!/usr/bin/env bash

# Check docker and docker-compose installation
docker -v > /dev/null 2>&1
if [ $? -ne 0 ]; then
     echo "You don't have docker installed, please install it and re-run the command"
     exit 0
fi

docker-compose -v > /dev/null 2>&1
if [ $? -ne 0 ]; then
     echo "You don't have docker-compose installed, please install it and re-run the command"
     exit 0
fi

DOCKER_COMPOSE_FOLDER=openvidu

# Create folder openvidu-docker-compose
mkdir ${DOCKER_COMPOSE_FOLDER}

# Download necessaries files
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/.env \
     --output ${DOCKER_COMPOSE_FOLDER}/.env
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.override.yml \
     --output ${DOCKER_COMPOSE_FOLDER}/docker-compose.override.yml
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.yml \
     --output ${DOCKER_COMPOSE_FOLDER}/docker-compose.yml
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/openvidu.sh \
    --output ${DOCKER_COMPOSE_FOLDER}/openvidu.sh
curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/readme.md \
    --output ${DOCKER_COMPOSE_FOLDER}/readme.md

# Add execution permissions
chmod +x ${DOCKER_COMPOSE_FOLDER}/openvidu-restart.sh

# Create own certificated folder
mkdir ${DOCKER_COMPOSE_FOLDER}/owncert

# Ready to use
printf "\n========================================"
printf "\nOpenvidu CE has successfully installed."
printf '\nNow run "./openvidu.sh start" in folder "openvidu-docker-compose" for setup.'
printf '\nRun "./openvidu.sh help" in folder for more information about "openvido" command.'
printf '\n"Check "readme.md" in folder "openvidu-docker-compose" for more details.\n\n'
exit 0
