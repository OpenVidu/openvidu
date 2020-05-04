#!/usr/bin/env bash

OPENVIDU_FOLDER=openvidu
OPENVIDU_VERSION=master

# Check docker and docker-compose installation
if ! command -v docker > /dev/null; then
     echo "You don't have docker installed, please install it and re-run the command"
     exit 0
fi

if ! command -v docker-compose > /dev/null; then
     echo "You don't have docker-compose installed, please install it and re-run the command"
     exit 0
else
     COMPOSE_VERSION=$(docker-compose version --short | sed "s/-rc[0-9]*//")
     if ! printf '%s\n%s\n' "1.24" "$COMPOSE_VERSION" | sort -V -C; then
          echo "You need a docker-compose version equal or higher than 1.24, please update your docker-compose and re-run the command"; \
          exit 0
     fi
fi

# Create folder openvidu-docker-compose
mkdir ${OPENVIDU_FOLDER}

# Download necessaries files
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/.env \
     --output ${OPENVIDU_FOLDER}/.env
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/docker-compose.override.yml \
     --output ${OPENVIDU_FOLDER}/docker-compose.override.yml
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/docker-compose.yml \
     --output ${OPENVIDU_FOLDER}/docker-compose.yml
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/openvidu \
    --output ${OPENVIDU_FOLDER}/openvidu
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/readme.md \
    --output ${OPENVIDU_FOLDER}/readme.md

# Add execution permissions
chmod +x ${OPENVIDU_FOLDER}/openvidu

# Create own certificated folder
mkdir ${OPENVIDU_FOLDER}/owncert

# Ready to use
printf "\n"
printf "\n   Openvidu Platform successfully installed."
printf "\n"
printf '\n   1. Go to openvidu folder:'
printf '\n   $ cd openvidu'
printf "\n"
printf '\n   2. Configure DOMAIN_OR_PUBLIC_IP and OPENVIDU_SECRET in .env file:'
printf "\n   $ nano .env" 
printf "\n"
printf '\n   3. Start OpenVidu'
printf '\n   $ ./openvidu start'
printf '\n'
printf '\n   For more information, check readme.md'
printf '\n'
printf '\n'
exit 0
