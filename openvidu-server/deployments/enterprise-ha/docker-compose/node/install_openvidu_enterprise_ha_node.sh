#!/usr/bin/env bash

# Global variables
OPENVIDU_FOLDER=openvidu
OPENVIDU_VERSION=v2.32.0
OPENVIDU_UPGRADABLE_VERSION="2.31"
BEATS_FOLDER=${OPENVIDU_FOLDER}/beats
DOWNLOAD_URL=https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}
IMAGES_MEDIA_NODE_CONTROLLER=(
    "kurento-media-server"
    "docker.elastic.co/beats/filebeat"
    "docker.elastic.co/beats/metricbeat"
    "openvidu/mediasoup-controller"
    "openvidu/openvidu-recording"
    "openvidu/speech-to-text-service"
)

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
    pushd "${OV_DIRECTORY}" > /dev/null || fatal_error "Error: can not access to '${OV_DIRECTORY}'"
    echo "Pulling images..."
    for image in "${IMAGES_MEDIA_NODE_CONTROLLER[@]}"; do
        IMAGE_PULL="$(grep "$image" docker-compose.yml | cut -d "=" -f2)"
        docker pull "$IMAGE_PULL" || fatal_error "Error: can not pull '${IMAGE_PULL}'"
    done
    DEPLOYMENT_IMAGES=$(grep 'image:' docker-compose.yml | awk '{print $2}')
    for IMAGE in ${DEPLOYMENT_IMAGES}; do
        docker pull "${IMAGE}" || fatal_error "Error while pulling image '${IMAGE}'"
    done
    popd > /dev/null || fatal_error "Error: can not access to previous directory"
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
    printf '\n          Install OpenVidu Enterprise HA %s' "${OPENVIDU_VERSION}"
    printf '\n     ======================================='
    printf '\n'

    # Create folder openvidu-docker-compose
    printf '\n     => Creating folder '%s'...' "${OPENVIDU_FOLDER}"
    mkdir "${OPENVIDU_FOLDER}" || fatal_error "Error while creating the folder '${OPENVIDU_FOLDER}'"

    # Create beats folder
    printf "\n     => Creating folder 'beats'..."
    mkdir -p "${BEATS_FOLDER}" || fatal_error "Error while creating the folder 'beats'"

    # Download necessary files
    printf '\n     => Downloading OpenVidu Enterprise HA files:'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/beats/filebeat.yml \
        --output "${BEATS_FOLDER}/filebeat.yml" || fatal_error "Error when downloading the file 'filebeat.yml'"
    printf '\n          - filebeat.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/beats/metricbeat-elasticsearch.yml \
        --output "${BEATS_FOLDER}/metricbeat-elasticsearch.yml" || fatal_error "Error when downloading the file 'metricbeat-elasticsearch.yml'"
    printf '\n          - metricbeat-elasticsearch.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/.env \
        --output "${OPENVIDU_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
    printf '\n          - .env'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/docker-compose.yml \
        --output "${OPENVIDU_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/openvidu \
        --output "${OPENVIDU_FOLDER}/openvidu" || fatal_error "Error when downloading the file 'openvidu'"
    printf '\n          - openvidu'

    # Add execution permissions
    printf "\n     => Adding permission:"

    chmod +x "${OPENVIDU_FOLDER}/openvidu" || fatal_error "Error while adding permission to 'openvidu' program"
    printf '\n          - openvidu'

    # Change recording folders with all permissions
    printf "\n     => Adding permission to 'recordings' folder...\n"
    mkdir -p "${OPENVIDU_FOLDER}/recordings"
    mkdir -p "${OPENVIDU_FOLDER}/mncontroller/recordings"
    chmod 777 "${OPENVIDU_FOLDER}/mncontroller/recordings"

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
    printf '\n     $ cd openvidu'
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
    printf '\n     3. Start OpenVidu'
    printf '\n     ------------------------------------------------'
    printf '\n     $ ./openvidu start'
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

    # Check installation is a valid OpenVidu edition
    if grep -q '.*image:.*\/openvidu-server:.*' "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml"; then
        fatal_error "You can't upgrade. Installed version is OpenVidu CE"
    fi
    if ! grep -q '.*image:.*\/replication-manager-on-prem:.*' "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml"; then
        fatal_error "You can't upgrade. Installed version is OpenVidu PRO"
    fi

    printf '\n'
    printf '\n     ======================================='
    printf '\n       Upgrade OpenVidu Enterprise HA %s to %s' "${OPENVIDU_PREVIOUS_VERSION}" "${OPENVIDU_VERSION}"
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
    printf '\n     => Downloading new OpenVidu Enterprise files:'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/beats/filebeat.yml \
        --output "${TMP_FOLDER}/filebeat.yml" || fatal_error "Error when downloading the file 'filebeat.yml'"
    printf '\n          - filebeat.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/beats/metricbeat-elasticsearch.yml \
        --output "${TMP_FOLDER}/metricbeat-elasticsearch.yml" || fatal_error "Error when downloading the file 'metricbeat-elasticsearch.yml'"
    printf '\n          - metricbeat-elasticsearch.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/.env \
        --output "${TMP_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
    printf '\n          - .env'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/docker-compose.yml \
        --output "${TMP_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise-ha/docker-compose/node/openvidu \
        --output "${TMP_FOLDER}/openvidu" || fatal_error "Error when downloading the file 'openvidu'"
    printf '\n          - openvidu'

    # Downloading new images and stopped actual Openvidu
    printf '\n     => Downloading new images...'
    printf '\n'
    sleep 1

    printf "\n          => Moving to 'tmp' folder..."
    printf '\n'
    cd "${TMP_FOLDER}" || fatal_error "Error when moving to 'tmp' folder"
    printf '\n'
    docker-compose pull || true

    printf '\n     => Stopping Openvidu...'
    printf '\n'
    sleep 1

    printf "\n          => Moving to 'openvidu' folder..."
    printf '\n'
    cd "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error when moving to 'openvidu' folder"
    printf '\n'
    docker-compose down || true

    printf '\n'
    printf '\n     => Moving to working dir...'
    cd "${ACTUAL_FOLDER}" || fatal_error "Error when moving to working dir"

    # Move old files to rollback folder
    printf '\n     => Moving previous installation files to rollback folder:'

    mv "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    mv "${OPENVIDU_PREVIOUS_FOLDER}/openvidu" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'openvidu'"
    printf '\n          - openvidu'

    mv "${OPENVIDU_PREVIOUS_FOLDER}/beats" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'beats'"
    printf '\n          - beats'

    cp "${OPENVIDU_PREVIOUS_FOLDER}/.env" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous '.env'"
    printf '\n          - .env'

    if [ -d "${OPENVIDU_PREVIOUS_FOLDER}/coturn" ]; then
        mv "${OPENVIDU_PREVIOUS_FOLDER}/coturn" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous directory 'coturn'"
    fi

    # Move tmp files to Openvidu
    printf '\n     => Updating files:'

    mv "${TMP_FOLDER}/docker-compose.yml" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'docker-compose.yml'"
    printf '\n          - docker-compose.yml'

    mv "${TMP_FOLDER}/.env" "${OPENVIDU_PREVIOUS_FOLDER}/.env-${OPENVIDU_VERSION}" || fatal_error "Error while moving previous '.env'"
    printf '\n          - .env-%s' "${OPENVIDU_VERSION}"

    mv "${TMP_FOLDER}/openvidu" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'openvidu'"
    printf '\n          - openvidu'

    mkdir "${OPENVIDU_PREVIOUS_FOLDER}/beats" || fatal_error "Error while creating the folder 'beats'"

    mv "${TMP_FOLDER}/filebeat.yml" "${OPENVIDU_PREVIOUS_FOLDER}/beats/filebeat.yml" || fatal_error "Error while updating 'filebeat.yml'"
    printf '\n          - beats/filebeat.yml'

    mv "${TMP_FOLDER}/metricbeat-elasticsearch.yml" "${OPENVIDU_PREVIOUS_FOLDER}/beats/metricbeat-elasticsearch.yml" || fatal_error "Error while updating 'metricbeat-elasticsearch.yml'"
    printf '\n          - beats/metricbeat-elasticsearch.yml'

    printf "\n     => Deleting 'tmp' folder"
    rm -rf "${TMP_FOLDER}" || fatal_error "Error deleting 'tmp' folder"

    # Add execution permissions
    printf "\n     => Adding permission to 'openvidu' program..."

    chmod +x "${OPENVIDU_PREVIOUS_FOLDER}/openvidu" || fatal_error "Error while adding permission to 'openvidu' program"
    printf '\n          - openvidu'

    # Change recording folder with all permissions
    printf "\n     => Adding permission to 'recordings' folder..."
    mkdir -p "${OPENVIDU_PREVIOUS_FOLDER}/recordings"

    # Define old mode: On Premise or Cloud Formation
    OLD_MODE=$(grep -E "Installation Mode:.*$" "${ROLL_BACK_FOLDER}/docker-compose.yml" | awk '{ print $4,$5 }')
    [ -n "${OLD_MODE}" ] && sed -i -r "s/Installation Mode:.+/Installation Mode: ${OLD_MODE}/" "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml"

    pull_images "${OPENVIDU_PREVIOUS_FOLDER}"

    # Ready to use
    printf '\n'
    printf '\n'
    printf '\n     ================================================'
    printf "\n     Openvidu Enterprise HA successfully upgraded to version %s" "${OPENVIDU_VERSION}"
    printf '\n     ================================================'
    printf '\n'
    printf "\n     1. A new file 'docker-compose.yml' has been created with the new OpenVidu Enterprise HA %s services" "${OPENVIDU_VERSION}"
    printf '\n'
    printf "\n     2. The previous file '.env' remains intact, but a new file '.env-%s' has been created." "${OPENVIDU_VERSION}"
    printf "\n     Transfer any configuration you wish to keep in the upgraded version from '.env' to '.env-%s'." "${OPENVIDU_VERSION}"
    printf "\n     When you are OK with it, rename and leave as the only '.env' file of the folder the new '.env-%s'." "${OPENVIDU_VERSION}"
    printf '\n'
    printf '\n     3. Start new version of Openvidu'
    printf '\n     ------------------------------------------------'
    printf '\n     $ ./openvidu start'
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
