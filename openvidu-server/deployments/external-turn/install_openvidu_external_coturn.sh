#!/usr/bin/env bash

COTURN_FOLDER="coturn"
CERTBOT_WRAPPER="${COTURN_FOLDER}/certbot-wrapper"
COTURN_VERSION=master
DOWNLOAD_URL="https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-server/deployments/external-turn/${COTURN_VERSION}"
#COTURN_VERSION=4.5.2
#DOWNLOAD_URL="https://s3.eu-west-1.amazonaws.com/aws.openvidu.io/external-turn/${COTURN_VERSION}"

# Support docker compose v1 and v2
shopt -s expand_aliases
alias docker-compose='docker compose'
if ! docker compose version &> /dev/null; then
    unalias docker-compose
fi

# Change default http timeout for slow networks
export COMPOSE_HTTP_TIMEOUT=500
export DOCKER_CLIENT_TIMEOUT=500

fatal_error() {
    printf "\n     =======¡ERROR!======="
    printf "\n     %s" "$1"
    printf "\n"
    exit 1
}

new_coturn_installation() {
    printf '\n'
    printf '\n     ======================================='
    printf '\n          Install OpenVidu External Coturn %s' "${COTURN_VERSION}"
    printf '\n     ======================================='
    printf '\n'

    # Create coturn directory
    printf '\n     => Creating folder '%s'...' "${COTURN_FOLDER}"
    mkdir "${COTURN_FOLDER}" || fatal_error "Error while creating the folder '${COTURN_FOLDER}'"

    # Create coturn directory
    printf '\n     => Creating folder '%s'...' "${CERTBOT_WRAPPER}"
    mkdir "${CERTBOT_WRAPPER}" || fatal_error "Error while creating the folder '${CERTBOT_WRAPPER}'"

    # Download necessary files
    printf '\n     => Downloading OpenVidu Pro files:'

    curl --silent ${DOWNLOAD_URL}/.env \
        --output "${COTURN_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
    printf '\n          - .env'

    curl --silent ${DOWNLOAD_URL}/docker-compose.yml \
        --output "${COTURN_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    curl --silent ${DOWNLOAD_URL}/certbot.sh \
        --output "${CERTBOT_WRAPPER}/certbot.sh" || fatal_error "Error when downloading the file 'certbot.sh'"
    printf '\n          - certbot.sh'



    # Add execution permissions
    printf "\n     => Adding permission:"

    chmod +x "${CERTBOT_WRAPPER}/certbot.sh" || fatal_error "Error while adding permission to 'certbot.sh'"
    printf '\n          - certbot.sh'

    # Ready to use
    printf '\n'
    printf '\n'
    printf '\n     ======================================='
    printf '\n       External OpenVidu Coturn installed. %s' "${COTURN_VERSION}"
    printf '\n     ======================================='
    printf '\n'
    printf '\n     1. Go to coturn folder:'
    printf '\n     $ cd coturn'
    printf '\n'
    printf '\n     2. Configure all parameters specified at the .env file '
    printf '\n     $ nano .env'
    printf '\n'
    printf '\n     3. Start Coturn'
    printf '\n     $ docker-compose up -d'
    printf '\n'
    printf '\n'
    exit 0

}

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

new_coturn_installation
