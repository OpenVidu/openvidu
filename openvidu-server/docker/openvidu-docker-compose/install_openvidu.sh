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

OPENVIDU_FOLDER=openvidu

# Create folder openvidu-docker-compose
mkdir ${OPENVIDU_FOLDER}

# Download necessaries files
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/.env \
     --output ${OPENVIDU_FOLDER}/.env
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.override.yml \
     --output ${OPENVIDU_FOLDER}/docker-compose.override.yml
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/docker-compose.yml \
     --output ${OPENVIDU_FOLDER}/docker-compose.yml
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/openvidu \
    --output ${OPENVIDU_FOLDER}/openvidu.sh
curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/docker/openvidu-docker-compose/readme.md \
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
printf '\n   2. Configure OPENVIDU_DOMAIN_OR_PUBLIC_IP and OPENVIDU_SECRET in .env file:'
printf "\n   $ nano .env" 
printf "\n"
printf '\n   3. Start OpenVidu'
printf '\n   $ ./openvidu start'
printf '\n'
printf '\n   For more information, check readme.md'
printf '\n'
printf '\n'
exit 0
