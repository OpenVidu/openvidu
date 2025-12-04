#!/usr/bin/env bash

# Global variables
OPENVIDU_FOLDER=ov-enterprise-base-services
ELASTICSEARCH_FOLDER=${OPENVIDU_FOLDER}/elasticsearch
OPENVIDU_VERSION=v2
OPENVIDU_UPGRADABLE_VERSION="2.32"
DOWNLOAD_URL=https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}

# Support docker compose v1 and v2
shopt -s expand_aliases
alias docker-compose='docker compose'
if ! docker compose version &> /dev/null; then
    unalias docker-compose
fi

# Change default http timeout for slow networks
export COMPOSE_HTTP_TIMEOUT=500
export DOCKER_CLIENT_TIMEOUT=500

pull_images() {
    OV_DIRECTORY="$1"
    pushd "${OV_DIRECTORY}" > /dev/null || fatal_error "Error: can not access to '${OV_DIRECTORY}' folder"
    ALL_IMAGES=$(grep  -h 'image:' docker-compose.yml docker-compose.override.yml | awk '{print $2}')
    for IMAGE in ${ALL_IMAGES}; do
        docker pull "${IMAGE}" || fatal_error "Error while pulling image '${IMAGE}'"
    done
    popd > /dev/null || fatal_error "Error: can not access to previous folder"
}

fatal_error() {
    printf "\n     =======¡ERROR!======="
    printf "\n     %s" "$1"
    printf "\n"
    exit 1
}

new_ov_installation() {
    printf '\n'
    printf '\n     ======================================='
    printf '\n          Install OpenVidu Enterprise HA Base Services %s' "${OPENVIDU_VERSION}"
    printf '\n     ======================================='
    printf '\n'

    # Create folder openvidu-docker-compose
    printf '\n     => Creating folder '%s'...' "${OPENVIDU_FOLDER}"
    mkdir "${OPENVIDU_FOLDER}" || fatal_error "Error while creating the folder '${OPENVIDU_FOLDER}'"

    # Create elasticsearch folder
    printf "\n     => Creating folder 'elasticsearch'..."
    mkdir -p "${ELASTICSEARCH_FOLDER}" || fatal_error "Error while creating the folder 'elasticsearch'"

    printf "\n     => Changing permission to 'elasticsearch' folder..."
    chown 1000:1000 "${ELASTICSEARCH_FOLDER}" || fatal_error "Error while changing permission to 'elasticsearch' folder"

    # Download necessary files
    printf '\n     => Downloading OpenVidu Enterprise HA files:'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/.env \
        --output "${OPENVIDU_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
    printf '\n          - .env'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/docker-compose.yml \
        --output "${OPENVIDU_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/docker-compose.override.yml \
        --output "${OPENVIDU_FOLDER}/docker-compose.override.yml" || fatal_error "Error when downloading the file 'docker-compose.override.yml'"
    printf '\n          - docker-compose.override.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/base-services \
        --output "${OPENVIDU_FOLDER}/base-services" || fatal_error "Error when downloading the file 'base-services'"
    printf '\n          - base-services'

    # Add execution permissions
    printf "\n     => Adding permission:"

    chmod +x "${OPENVIDU_FOLDER}/base-services" || fatal_error "Error while adding permission to 'base-services' program"
    printf '\n          - base-services'

    # Pull all docker images
    pull_images "${OPENVIDU_FOLDER}"

    # Ready to use
    printf '\n'
    printf '\n'
    printf '\n     ======================================='
    printf '\n       OpenVidu Enterprise HA successfully installed.'
    printf '\n     ======================================='
    printf '\n'
    printf '\n     1. Go to openvidu folder:'
    printf '\n     ------------------------------------------------'
    printf '\n     $ cd ov-enterprise-base-services'
    printf '\n     ------------------------------------------------'
    printf '\n'
    printf '\n'
    printf '\n     2. Configure the .env file with your own values:'
    printf '\n        Check the documentation for more information:'
    printf '\n        https://docs.openvidu.io/en/%s/deployment/enterprise/on-premises/#high-availability-deployment' "${OPENVIDU_VERSION//v}"
    printf '\n     ------------------------------------------------'
    printf '\n     $ nano .env'
    printf '\n     ------------------------------------------------'
    printf '\n'
    printf '\n'
    printf '\n     3. Start OpenVidu Enterprise HA Base Services:'
    printf '\n     ------------------------------------------------'
    printf '\n     $ ./base-services start'
    printf '\n     ------------------------------------------------'
    printf '\n'
    printf '\n'
    printf '\n'
    exit 0
}

get_previous_env_variable() {
    local ENV_VARIABLE_NAME=$1
    echo "$(grep -E "${ENV_VARIABLE_NAME}=.*$" "${OPENVIDU_PREVIOUS_FOLDER}/.env" | cut -d'=' -f2)"
}

replace_variable_in_new_env_file() {
    local ENV_VARIABLE_NAME=$1
    local ENV_VARIABLE_VALUE=$2
    [[ -n "${ENV_VARIABLE_VALUE}" ]] && sed -i "s|#${ENV_VARIABLE_NAME}=|${ENV_VARIABLE_NAME}=${ENV_VARIABLE_VALUE}|" "${OPENVIDU_PREVIOUS_FOLDER}/.env-${OPENVIDU_VERSION}"
}

upgrade_ov() {
    # Search local Openvidu installation
    printf '\n'
    printf '\n     ========================================================='
    printf '\n       Search Previous Installation of Openvidu Enterprise HA'
    printf '\n     ========================================================='
    printf '\n'

    SEARCH_IN_FOLDERS=(
        "${PWD}"
        "/opt/${OPENVIDU_FOLDER}"
    )

    for folder in "${SEARCH_IN_FOLDERS[@]}"; do
        printf "\n     => Searching in '%s' folder..." "${folder}"

        if [ -f "${folder}/docker-compose.yml" ]; then
            OPENVIDU_PREVIOUS_FOLDER="${folder}"

            printf "\n     => Found installation in folder '%s'" "${folder}"
            break
        fi
    done

    [ -z "${OPENVIDU_PREVIOUS_FOLDER}" ] && fatal_error "No previous Openvidu installation found"

    # Upgrade Openvidu
    OPENVIDU_PREVIOUS_VERSION=$(grep 'Openvidu Version:' "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml" | awk '{ print $4 }')
    [ -z "${OPENVIDU_PREVIOUS_VERSION}" ] && fatal_error "Can't find previous OpenVidu version"

    # In this point using the variable 'OPENVIDU_PREVIOUS_VERSION' we can verify if the upgrade is
    # posible or not. If it is not posible launch a warning and stop the upgrade.
    if [[ "${OPENVIDU_PREVIOUS_VERSION}" != "${OPENVIDU_UPGRADABLE_VERSION}."* ]] && [[ "${OPENVIDU_PREVIOUS_VERSION}" != "${OPENVIDU_VERSION//v}"* ]]; then
        fatal_error "You can't update from version ${OPENVIDU_PREVIOUS_VERSION} to ${OPENVIDU_VERSION}.\nNever upgrade across multiple major versions."
    fi

    printf '\n'
    printf '\n     ======================================='
    printf '\n       Upgrade OpenVidu Enterprise HA base services %s to %s' "${OPENVIDU_PREVIOUS_VERSION}" "${OPENVIDU_VERSION}"
    printf '\n     ======================================='
    printf '\n'

    ROLL_BACK_FOLDER="${OPENVIDU_PREVIOUS_FOLDER}/.old-${OPENVIDU_PREVIOUS_VERSION}"
    TMP_FOLDER="${OPENVIDU_PREVIOUS_FOLDER}/tmp"
    ACTUAL_FOLDER="${PWD}"

    printf "\n     Creating rollback folder '%s'..." ".old-${OPENVIDU_PREVIOUS_VERSION}"
    mkdir "${ROLL_BACK_FOLDER}" || fatal_error "Error while creating the folder '.old-${OPENVIDU_PREVIOUS_VERSION}'"

    printf "\n     Creating temporal folder 'tmp'..."
    mkdir "${TMP_FOLDER}" || fatal_error "Error while creating the folder 'temporal'"

    # Download necessary files
    printf '\n     => Downloading new OpenVidu Enterprise HA base services files:'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/.env \
        --output "${TMP_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
    printf '\n          - .env'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/docker-compose.yml \
        --output "${TMP_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/docker-compose.override.yml \
        --output "${TMP_FOLDER}/docker-compose.override.yml" || fatal_error "Error when downloading the file 'docker-compose.override.yml'"
    printf '\n          - docker-compose.override.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/base-services/base-services \
        --output "${TMP_FOLDER}/base-services" || fatal_error "Error when downloading the file 'base-services'"
    printf '\n          - base-services'

    # Downloading new images and stopped actual Openvidu
    printf '\n     => Downloading new images...'
    printf '\n'
    sleep 1

    printf "\n          => Moving to 'tmp' folder..."
    printf '\n'
    cd "${TMP_FOLDER}" || fatal_error "Error when moving to 'tmp' folder"
    printf '\n'
    docker-compose pull || true

    printf '\n     => Stopping base services...'
    printf '\n'
    sleep 1

    printf "\n          => Moving to 'base-services' folder..."
    printf '\n'
    cd "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error when moving to 'base-services' folder"
    printf '\n'
    docker-compose down || true

    printf '\n'
    printf '\n     => Moving to working dir...'
    cd "${ACTUAL_FOLDER}" || fatal_error "Error when moving to working dir"

    # Move old files to rollback folder
    printf '\n     => Moving previous installation files to rollback folder:'

    mv "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    mv "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.override.yml" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'docker-compose.override.yml'"
    printf '\n          - docker-compose.override.yml'

    mv "${OPENVIDU_PREVIOUS_FOLDER}/base-services" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'base-services'"
    printf '\n          - base-services'

    cp "${OPENVIDU_PREVIOUS_FOLDER}/.env" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous '.env'"
    printf '\n          - .env'

    # Move tmp files to Openvidu
    printf '\n     => Updating files:'

    mv "${TMP_FOLDER}/docker-compose.yml" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    mv "${TMP_FOLDER}/docker-compose.override.yml" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'docker-compose.override.yml'"
    printf '\n          - docker-compose.override.yml'

    mv "${TMP_FOLDER}/.env" "${OPENVIDU_PREVIOUS_FOLDER}/.env-${OPENVIDU_VERSION}" || fatal_error "Error while moving previous '.env'"
    printf '\n          - .env-%s' "${OPENVIDU_VERSION}"

    mv "${TMP_FOLDER}/base-services" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'base-services'"
    printf '\n          - base-services'

    printf "\n     => Deleting 'tmp' folder"
    rm -rf "${TMP_FOLDER}" || fatal_error "Error deleting 'tmp' folder"

    # Add execution permissions
    printf "\n     => Adding permission to 'base-services' program..."

    chmod +x "${OPENVIDU_PREVIOUS_FOLDER}/base-services" || fatal_error "Error while adding permission to 'base-services' program"
    printf '\n          - base-services'

    # Define old mode: On Premise or Cloud Formation
    OLD_MODE=$(grep -E "Installation Mode:.*$" "${ROLL_BACK_FOLDER}/docker-compose.yml" | awk '{ print $4,$5 }')
    [ -n "${OLD_MODE}" ] && sed -i -r "s/Installation Mode:.+/Installation Mode: ${OLD_MODE}/" "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml"

    pull_images "${OPENVIDU_PREVIOUS_FOLDER}"

    # Ready to use
    printf '\n'
    printf '\n'
    printf '\n     ================================================'
    printf "\n     Openvidu Enterprise HA base services successfully upgraded to version %s" "${OPENVIDU_VERSION}"
    printf '\n     ================================================'
    printf '\n'
    printf "\n     1. A new file 'docker-compose.yml' has been created with the new OpenVidu Enterprise HA %s services" "${OPENVIDU_VERSION}"
    printf '\n'
    printf "\n     2. The previous file '.env' remains intact, but a new file '.env-%s' has been created." "${OPENVIDU_VERSION}"
    printf "\n     Transfer any configuration you wish to keep in the upgraded version from '.env' to '.env-%s'." "${OPENVIDU_VERSION}"
    printf "\n     When you are OK with it, rename and leave as the only '.env' file of the folder the new '.env-%s'." "${OPENVIDU_VERSION}"
    printf '\n'
    printf "\n     3. If you were using Openvidu Call application, it has been automatically updated in file 'docker-compose.override.yml'."
    printf "\n     However, if you were using your own application, a file called 'docker-compose.override.yml-%s'" "${OPENVIDU_VERSION}"
    printf "\n     has been created with the latest version of Openvidu Call. If you don't plan to use it you can delete it."
    printf '\n'
    printf '\n     3. Start new versions of Openvidu Enterprise HA Base Services'
    printf '\n     ------------------------------------------------'
    printf '\n     $ ./base-services start'
    printf '\n     ------------------------------------------------'
    printf '\n'
    printf "\n     If you want to rollback, all the files from the previous installation have been copied to folder '.old-%s'" "${OPENVIDU_PREVIOUS_VERSION}"
    printf '\n'
    printf '\n'
    printf '\n'
}

# Check docker and docker-compose installation
if ! command -v docker > /dev/null; then
    echo "You don't have docker installed, please install it and re-run the command"
    exit 1
else
    # Check version of docker is equal or higher than 20.10.10
    DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' | sed "s/-rc[0-9]*//")
    if ! printf '%s\n%s\n' "20.10.10" "$DOCKER_VERSION" | sort -V -C; then
        echo "You need a docker version equal or higher than 20.10.10, please update your docker and re-run the command"; \
        exit 1
    fi
fi

if ! command -v docker-compose > /dev/null; then
    echo "You don't have docker-compose installed, please install it and re-run the command"
    exit 1
else
    COMPOSE_VERSION=$(docker-compose version --short | sed "s/-rc[0-9]*//")
    if ! printf '%s\n%s\n' "1.24" "$COMPOSE_VERSION" | sort -V -C; then
        echo "You need a docker-compose version equal or higher than 1.24, please update your docker-compose and re-run the command"; \
        exit 1
    fi
fi

# Check type of installation
if [[ -n "$1" && "$1" == "upgrade" ]]; then
    upgrade_ov "$2"
else
    new_ov_installation
fi
