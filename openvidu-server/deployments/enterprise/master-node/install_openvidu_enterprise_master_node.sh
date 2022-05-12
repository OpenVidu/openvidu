#!/usr/bin/env bash

# Global variables
OPENVIDU_FOLDER=openvidu
OPENVIDU_VERSION=master
OPENVIDU_UPGRADABLE_VERSION="2.22"
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

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/cluster/aws/openvidu_autodiscover.sh \
          --output "${AWS_SCRIPTS_FOLDER}/openvidu_autodiscover.sh" || fatal_error "Error when downloading the file 'openvidu_autodiscover.sh'"
     printf '\n          - openvidu_autodiscover.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/cluster/aws/openvidu_drop.sh \
          --output "${AWS_SCRIPTS_FOLDER}/openvidu_drop.sh" || fatal_error "Error when downloading the file 'openvidu_drop.sh'"
     printf '\n          - openvidu_drop.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/cluster/aws/openvidu_launch_kms.sh \
          --output "${AWS_SCRIPTS_FOLDER}/openvidu_launch_kms.sh" || fatal_error "Error when downloading the file 'openvidu_launch_kms.sh'"
     printf '\n          - openvidu_launch_kms.sh'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/beats/filebeat.yml \
          --output "${BEATS_FOLDER}/filebeat.yml" || fatal_error "Error when downloading the file 'filebeat.yml'"
     printf '\n          - filebeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/beats/metricbeat.yml \
          --output "${BEATS_FOLDER}/metricbeat.yml" || fatal_error "Error when downloading the file 'metricbeat.yml'"
     printf '\n          - metricbeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/.env \
          --output "${OPENVIDU_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
     printf '\n          - .env'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/docker-compose.yml \
          --output "${OPENVIDU_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/enterprise/master-node/openvidu \
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
     fatal_error "OpenVidu Enterprise HA can't be upgraded manually. Deploy the Cloudformation template of the version '${OPENVIDU_VERSION}' you want to deploy: https://docs.openvidu.io/en/${OPENVIDU_VERSION//v}/deployment/enterprise/aws/"
else
     new_ov_installation
fi
