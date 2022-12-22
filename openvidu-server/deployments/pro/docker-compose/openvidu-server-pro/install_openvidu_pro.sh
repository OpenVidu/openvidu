#!/usr/bin/env bash

# Global variables
OPENVIDU_FOLDER=openvidu
OPENVIDU_VERSION=v2.25.0
OPENVIDU_UPGRADABLE_VERSION="2.24"
AWS_SCRIPTS_FOLDER=${OPENVIDU_FOLDER}/cluster/aws
ELASTICSEARCH_FOLDER=${OPENVIDU_FOLDER}/elasticsearch
BEATS_FOLDER=${OPENVIDU_FOLDER}/beats
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

fatal_error() {
    printf "\n     =======¡ERROR!======="
    printf "\n     %s" "$1"
    printf "\n"
    exit 1
}

new_ov_installation() {
     printf '\n'
     printf '\n     ======================================='
     printf '\n          Install OpenVidu Pro %s' "${OPENVIDU_VERSION}"
     printf '\n     ======================================='
     printf '\n'

     # Create folder openvidu-docker-compose
     printf '\n     => Creating folder '%s'...' "${OPENVIDU_FOLDER}"
     mkdir "${OPENVIDU_FOLDER}" || fatal_error "Error while creating the folder '${OPENVIDU_FOLDER}'"

     # Create aws scripts folder
     printf "\n     => Creating folder 'cluster/aws'..."
     mkdir -p "${AWS_SCRIPTS_FOLDER}" || fatal_error "Error while creating the folder 'cluster/aws'"

     # Create beats folder
     printf "\n     => Creating folder 'beats'..."
     mkdir -p "${BEATS_FOLDER}" || fatal_error "Error while creating the folder 'beats'"

     # Create elasticsearch folder
     printf "\n     => Creating folder 'elasticsearch'..."
     mkdir -p "${ELASTICSEARCH_FOLDER}" || fatal_error "Error while creating the folder 'elasticsearch'"

     printf "\n     => Changing permission to 'elasticsearch' folder..."
     chown 1000:1000 "${ELASTICSEARCH_FOLDER}" || fatal_error "Error while changing permission to 'elasticsearch' folder"

     # Download necessary files
     printf '\n     => Downloading OpenVidu Pro files:'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/cluster/aws/openvidu_autodiscover.sh \
          --output "${AWS_SCRIPTS_FOLDER}/openvidu_autodiscover.sh" || fatal_error "Error when downloading the file 'openvidu_autodiscover.sh'"
     printf '\n          - openvidu_autodiscover.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/cluster/aws/openvidu_drop.sh \
          --output "${AWS_SCRIPTS_FOLDER}/openvidu_drop.sh" || fatal_error "Error when downloading the file 'openvidu_drop.sh'"
     printf '\n          - openvidu_drop.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/cluster/aws/openvidu_launch_kms.sh \
          --output "${AWS_SCRIPTS_FOLDER}/openvidu_launch_kms.sh" || fatal_error "Error when downloading the file 'openvidu_launch_kms.sh'"
     printf '\n          - openvidu_launch_kms.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/beats/filebeat.yml \
          --output "${BEATS_FOLDER}/filebeat.yml" || fatal_error "Error when downloading the file 'filebeat.yml'"
     printf '\n          - filebeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/beats/metricbeat.yml \
          --output "${BEATS_FOLDER}/metricbeat.yml" || fatal_error "Error when downloading the file 'metricbeat.yml'"
     printf '\n          - metricbeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/.env \
          --output "${OPENVIDU_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
     printf '\n          - .env'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/docker-compose.override.yml \
          --output "${OPENVIDU_FOLDER}/docker-compose.override.yml" || fatal_error "Error when downloading the file 'docker-compose.override.yml'"
     printf '\n          - docker-compose.override.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/docker-compose.yml \
          --output "${OPENVIDU_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/openvidu \
          --output "${OPENVIDU_FOLDER}/openvidu" || fatal_error "Error when downloading the file 'openvidu'"
     printf '\n          - openvidu'

     # Add execution permissions
     printf "\n     => Adding permission:"

     chmod +x "${OPENVIDU_FOLDER}/openvidu" || fatal_error "Error while adding permission to 'openvidu' program"
     printf '\n          - openvidu'

     # Change recording folder with all permissions
     printf "\n     => Adding permission to 'recordings' folder..."
     mkdir -p "${OPENVIDU_FOLDER}/recordings"

     chmod +x "${AWS_SCRIPTS_FOLDER}/openvidu_autodiscover.sh" || fatal_error "Error while adding permission to 'openvidu_autodiscover.sh' program"
     printf '\n          - openvidu_autodiscover.sh'

     chmod +x "${AWS_SCRIPTS_FOLDER}/openvidu_drop.sh" || fatal_error "Error while adding permission to 'openvidu' openvidu_drop.sh"
     printf '\n          - openvidu_drop.sh'

     chmod +x "${AWS_SCRIPTS_FOLDER}/openvidu_launch_kms.sh" || fatal_error "Error while adding permission to 'openvidu_launch_kms.sh' program"
     printf '\n          - openvidu_launch_kms.sh'

     # Create own certificated folder
     printf "\n     => Creating folder 'owncert'..."
     mkdir "${OPENVIDU_FOLDER}/owncert" || fatal_error "Error while creating the folder 'owncert'"

     # Create vhost nginx folder
     printf "\n     => Creating folder 'custom-nginx-vhosts'..."
     mkdir "${OPENVIDU_FOLDER}/custom-nginx-vhosts" || fatal_error "Error while creating the folder 'custom-nginx-vhosts'"

     # Create vhost nginx folder
     printf "\n     => Creating folder 'custom-nginx-locations'..."
     mkdir "${OPENVIDU_FOLDER}/custom-nginx-locations" || fatal_error "Error while creating the folder 'custom-nginx-locations'"

     # Ready to use
     printf '\n'
     printf '\n'
     printf '\n     ======================================='
     printf '\n       OpenVidu Pro successfully installed.'
     printf '\n     ======================================='
     printf '\n'
     printf '\n     1. Go to openvidu folder:'
     printf '\n     $ cd openvidu'
     printf '\n'
     printf '\n     2. Configure OPENVIDU_DOMAIN_OR_PUBLIC_IP, OPENVIDU_PRO_LICENSE, '
     printf '\n     OPENVIDU_SECRET, and ELASTICSEARCH_PASSWORD in .env file:'
     printf '\n     $ nano .env'
     printf '\n'
     printf '\n     3. Start OpenVidu'
     printf '\n     $ ./openvidu start'
     printf '\n'
     printf "\n     CAUTION: The folder 'openvidu/elasticsearch' use user and group 1000 permissions. "
     printf "\n     This folder is necessary for store elasticsearch data."
     printf "\n     For more information, check:"
     printf '\n     https://docs.openvidu.io/en/%s/openvidu-pro/deployment/on-premises/#deployment-instructions' "${OPENVIDU_VERSION//v}"
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
     printf '\n     ============================================'
     printf '\n       Search Previous Installation of Openvidu'
     printf '\n     ============================================'
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
     if grep -q '.*image:.*\/replication-manager:.*' "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml"; then
          fatal_error "You can't upgrade. Installed version is OpenVidu ENTERPRISE"
     fi

     # If deployment has AWS_DEFAULT_REGION defined (deployed with cloudformation), check if new AMI of the media node is present as argument
     NEW_AMI_ID="${1:-}"
     AWS_REGION=$(get_previous_env_variable AWS_DEFAULT_REGION)
     if [[ -n ${AWS_REGION} ]]; then
          OV_LINK_VERSION=${OPENVIDU_VERSION//.}
          OV_LINK_VERSION=${OV_LINK_VERSION//v}
          [[ -z ${NEW_AMI_ID} ]] && fatal_error "You need to copy and specify an AMI Id for Media Nodes. Check https://docs.openvidu.io/en/${OPENVIDU_VERSION//v}/deployment/pro/upgrading/#option-2-update-current-deployment-to-${OV_LINK_VERSION}"
     fi

     printf '\n'
     printf '\n     ======================================='
     printf '\n       Upgrade OpenVidu Pro %s to %s' "${OPENVIDU_PREVIOUS_VERSION}" "${OPENVIDU_VERSION}"
     printf '\n     ======================================='
     printf '\n'

     ROLL_BACK_FOLDER="${OPENVIDU_PREVIOUS_FOLDER}/.old-${OPENVIDU_PREVIOUS_VERSION}"
     TMP_FOLDER="${OPENVIDU_PREVIOUS_FOLDER}/tmp"
     ACTUAL_FOLDER="${PWD}"
     USE_OV_CALL=$(grep -E '^        image: openvidu/openvidu-call:.*$' "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.override.yml" | tr -d '[:space:]')

     printf "\n     Creating rollback folder '%s'..." ".old-${OPENVIDU_PREVIOUS_VERSION}"
     mkdir "${ROLL_BACK_FOLDER}" || fatal_error "Error while creating the folder '.old-${OPENVIDU_PREVIOUS_VERSION}'"

     printf "\n     Creating temporal folder 'tmp'..."
     mkdir "${TMP_FOLDER}" || fatal_error "Error while creating the folder 'temporal'"

     # Download necessary files
     printf '\n     => Downloading new OpenVidu Pro files:'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/cluster/aws/openvidu_autodiscover.sh \
          --output "${TMP_FOLDER}/openvidu_autodiscover.sh" || fatal_error "Error when downloading the file 'openvidu_autodiscover.sh'"
     printf '\n          - openvidu_autodiscover.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/cluster/aws/openvidu_drop.sh \
          --output "${TMP_FOLDER}/openvidu_drop.sh" || fatal_error "Error when downloading the file 'openvidu_drop.sh'"
     printf '\n          - openvidu_drop.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/cluster/aws/openvidu_launch_kms.sh \
          --output "${TMP_FOLDER}/openvidu_launch_kms.sh" || fatal_error "Error when downloading the file 'openvidu_launch_kms.sh'"
     printf '\n          - openvidu_launch_kms.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/beats/filebeat.yml \
          --output "${TMP_FOLDER}/filebeat.yml" || fatal_error "Error when downloading the file 'filebeat.yml'"
     printf '\n          - filebeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/beats/metricbeat.yml \
          --output "${TMP_FOLDER}/metricbeat.yml" || fatal_error "Error when downloading the file 'metricbeat.yml'"
     printf '\n          - metricbeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/.env \
          --output "${TMP_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
     printf '\n          - .env'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/docker-compose.override.yml \
          --output "${TMP_FOLDER}/docker-compose.override.yml" || fatal_error "Error when downloading the file 'docker-compose.override.yml'"
     printf '\n          - docker-compose.override.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/docker-compose.yml \
          --output "${TMP_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/openvidu-server-pro/openvidu \
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

     if [ -n "${USE_OV_CALL}" ]; then
          mv "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.override.yml" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'docker-compose.override.yml'"
          printf '\n          - docker-compose.override.yml'
     fi

     mv "${OPENVIDU_PREVIOUS_FOLDER}/openvidu" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'openvidu'"
     printf '\n          - openvidu'

     mv "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'cluster/aws'"
     printf '\n          - cluster/aws'

     mv "${OPENVIDU_PREVIOUS_FOLDER}/beats" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'beats'"
     printf '\n          - beats'

     cp "${OPENVIDU_PREVIOUS_FOLDER}/.env" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous '.env'"
     printf '\n          - .env'

     if [ -d "${OPENVIDU_PREVIOUS_FOLDER}/custom-nginx-vhosts" ]; then
          mv "${OPENVIDU_PREVIOUS_FOLDER}/custom-nginx-vhosts" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous directory 'custom-nginx-vhosts'"
          printf '\n          - custom-nginx-vhosts'
     fi

     if [ -d "${OPENVIDU_PREVIOUS_FOLDER}/custom-nginx-locations" ]; then
          mv "${OPENVIDU_PREVIOUS_FOLDER}/custom-nginx-locations" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous directory 'custom-nginx-locations'"
          printf '\n          - custom-nginx-locations'
     fi

     if [ -d "${OPENVIDU_PREVIOUS_FOLDER}/coturn" ]; then
          mv "${OPENVIDU_PREVIOUS_FOLDER}/coturn" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous directory 'coturn'"
     fi

     # Move tmp files to Openvidu
     printf '\n     => Updating files:'

     mv "${TMP_FOLDER}/docker-compose.yml" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     if [ -n "${USE_OV_CALL}" ]; then
          mv "${TMP_FOLDER}/docker-compose.override.yml" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'docker-compose.override.yml'"
          printf '\n          - docker-compose.override.yml'
     else
          mv "${TMP_FOLDER}/docker-compose.override.yml" "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.override.yml-${OPENVIDU_VERSION}" || fatal_error "Error while updating 'docker-compose.override.yml'"
          printf '\n          - docker-compose.override.yml-%s' "${OPENVIDU_VERSION}"
     fi

     mv "${TMP_FOLDER}/.env" "${OPENVIDU_PREVIOUS_FOLDER}/.env-${OPENVIDU_VERSION}" || fatal_error "Error while moving previous '.env'"
     printf '\n          - .env-%s' "${OPENVIDU_VERSION}"

     mv "${TMP_FOLDER}/openvidu" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'openvidu'"
     printf '\n          - openvidu'

     mkdir "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws" || fatal_error "Error while creating the folder 'cluster/aws'"

     mkdir "${OPENVIDU_PREVIOUS_FOLDER}/beats" || fatal_error "Error while creating the folder 'beats'"

     mv "${TMP_FOLDER}/openvidu_autodiscover.sh" "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws" || fatal_error "Error while updating 'openvidu_autodiscover.sh'"
     printf '\n          - openvidu_autodiscover.sh'

     mv "${TMP_FOLDER}/openvidu_drop.sh" "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws" || fatal_error "Error while updating 'openvidu_drop.sh'"
     printf '\n          - openvidu_drop.sh'

     mv "${TMP_FOLDER}/openvidu_launch_kms.sh" "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws" || fatal_error "Error while updating 'openvidu_launch_kms.sh'"
     printf '\n          - openvidu_launch_kms.sh'

     mv "${TMP_FOLDER}/filebeat.yml" "${OPENVIDU_PREVIOUS_FOLDER}/beats/filebeat.yml" || fatal_error "Error while updating 'filebeat.yml'"
     printf '\n          - filebeat.yml'

     mv "${TMP_FOLDER}/metricbeat.yml" "${OPENVIDU_PREVIOUS_FOLDER}/beats/metricbeat.yml" || fatal_error "Error while updating 'metricbeat.yml'"
     printf '\n          - metricbeat.yml'

     printf "\n     => Deleting 'tmp' folder"
     rm -rf "${TMP_FOLDER}" || fatal_error "Error deleting 'tmp' folder"

     # Add execution permissions
     printf "\n     => Adding permission to 'openvidu' program..."

     chmod +x "${OPENVIDU_PREVIOUS_FOLDER}/openvidu" || fatal_error "Error while adding permission to 'openvidu' program"
     printf '\n          - openvidu'

     # Change recording folder with all permissions
     printf "\n     => Adding permission to 'recordings' folder..."
     mkdir -p "${OPENVIDU_PREVIOUS_FOLDER}/recordings"

     chmod +x "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws/openvidu_autodiscover.sh" || fatal_error "Error while adding permission to 'openvidu_autodiscover.sh' program"
     printf '\n          - openvidu_autodiscover.sh'

     chmod +x "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws/openvidu_drop.sh" || fatal_error "Error while adding permission to 'openvidu' openvidu_drop.sh"
     printf '\n          - openvidu_drop.sh'

     chmod +x "${OPENVIDU_PREVIOUS_FOLDER}/cluster/aws/openvidu_launch_kms.sh" || fatal_error "Error while adding permission to 'openvidu_launch_kms.sh' program"
     printf '\n          - openvidu_launch_kms.sh'

     # Define old mode: On Premise or Cloud Formation
     OLD_MODE=$(grep -E "Installation Mode:.*$" "${ROLL_BACK_FOLDER}/docker-compose.yml" | awk '{ print $4,$5 }')
     [ -n "${OLD_MODE}" ] && sed -i -r "s/Installation Mode:.+/Installation Mode: ${OLD_MODE}/" "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml"

     # Update .env variables to new .env-version
     AWS_REGION=$(get_previous_env_variable AWS_DEFAULT_REGION)
     if [[ -n ${AWS_REGION} ]]; then

          # Get previous values
          PREV_AWS_DEFAULT_REGION=$(get_previous_env_variable AWS_DEFAULT_REGION)
          PREV_AWS_INSTANCE_TYPE=$(get_previous_env_variable AWS_INSTANCE_TYPE)
          PREV_AWS_INSTANCE_ID=$(get_previous_env_variable AWS_INSTANCE_ID)
          PREV_AWS_KEY_NAME=$(get_previous_env_variable AWS_KEY_NAME)
          PREV_AWS_SUBNET_ID=$(get_previous_env_variable AWS_SUBNET_ID)
          PREV_AWS_SECURITY_GROUP=$(get_previous_env_variable AWS_SECURITY_GROUP)
          PREV_AWS_STACK_ID=$(get_previous_env_variable AWS_STACK_ID)
          PREV_AWS_STACK_NAME=$(get_previous_env_variable AWS_STACK_NAME)
          PREV_AWS_CLI_DOCKER_TAG=$(get_previous_env_variable AWS_CLI_DOCKER_TAG)
          PREV_AWS_VOLUME_SIZE=$(get_previous_env_variable AWS_VOLUME_SIZE)

          # Replace variables in new .env-version file
          replace_variable_in_new_env_file "AWS_DEFAULT_REGION" "${PREV_AWS_DEFAULT_REGION}"
          replace_variable_in_new_env_file "AWS_INSTANCE_TYPE" "${PREV_AWS_INSTANCE_TYPE}"
          replace_variable_in_new_env_file "AWS_INSTANCE_ID" "${PREV_AWS_INSTANCE_ID}"
          replace_variable_in_new_env_file "AWS_KEY_NAME" "${PREV_AWS_KEY_NAME}"
          replace_variable_in_new_env_file "AWS_SUBNET_ID" "${PREV_AWS_SUBNET_ID}"
          replace_variable_in_new_env_file "AWS_SECURITY_GROUP" "${PREV_AWS_SECURITY_GROUP}"
          replace_variable_in_new_env_file "AWS_STACK_ID" "${PREV_AWS_STACK_ID}"
          replace_variable_in_new_env_file "AWS_STACK_NAME" "${PREV_AWS_STACK_NAME}"
          replace_variable_in_new_env_file "AWS_CLI_DOCKER_TAG" "${PREV_AWS_CLI_DOCKER_TAG}"
          replace_variable_in_new_env_file "AWS_VOLUME_SIZE" "${PREV_AWS_VOLUME_SIZE}"

          # Replace new AMI
          replace_variable_in_new_env_file "AWS_IMAGE_ID" "${NEW_AMI_ID}"
     fi


     # Ready to use
     printf '\n'
     printf '\n'
     printf '\n     ================================================'
     printf "\n     Openvidu successfully upgraded to version %s" "${OPENVIDU_VERSION}"
     printf '\n     ================================================'
     printf '\n'
     printf "\n     1. A new file 'docker-compose.yml' has been created with the new OpenVidu %s services" "${OPENVIDU_VERSION}"
     printf '\n'
     printf "\n     2. The previous file '.env' remains intact, but a new file '.env-%s' has been created." "${OPENVIDU_VERSION}"
     printf "\n     Transfer any configuration you wish to keep in the upgraded version from '.env' to '.env-%s'." "${OPENVIDU_VERSION}"
     printf "\n     When you are OK with it, rename and leave as the only '.env' file of the folder the new '.env-%s'." "${OPENVIDU_VERSION}"
     printf '\n'
     printf "\n     3. If you were using Openvidu Call application, it has been automatically updated in file 'docker-compose.override.yml'."
     printf "\n     However, if you were using your own application, a file called 'docker-compose.override.yml-%s'" "${OPENVIDU_VERSION}"
     printf "\n     has been created with the latest version of Openvidu Call. If you don't plan to use it you can delete it."
     printf '\n'
     printf '\n     4. Start new version of Openvidu'
     printf '\n     $ ./openvidu start'
     printf '\n'
     printf "\n     If you want to rollback, all the files from the previous installation have been copied to folder '.old-%s'" "${OPENVIDU_PREVIOUS_VERSION}"
     printf '\n'
     printf '\n'
     printf '\n'
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

# Check type of installation
if [[ -n "$1" && "$1" == "upgrade" ]]; then
     upgrade_ov "$2"
else
     new_ov_installation
fi
