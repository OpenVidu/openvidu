#!/usr/bin/env bash

MEDIA_NODE_FOLDER=kms
MEDIA_NODE_VERSION=v2.25.0
OPENVIDU_UPGRADABLE_VERSION="2.24"
BEATS_FOLDER=${MEDIA_NODE_FOLDER}/beats
OPENVIDU_RECORDINGS_FOLDER="/opt/openvidu/recordings"
DOWNLOAD_URL=https://raw.githubusercontent.com/OpenVidu/openvidu/${MEDIA_NODE_VERSION}
IMAGES=(
  "kurento-media-server"
  "docker.elastic.co/beats/filebeat"
  "docker.elastic.co/beats/metricbeat"
  "openvidu/media-node-controller"
  "openvidu/speech-to-text-service"
  "openvidu/mediasoup-controller"
  "openvidu/openvidu-coturn"
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

fatal_error() {
     printf "\n     =======¡ERROR!======="
     printf "\n     %s" "$1"
     printf "\n"
     exit 1
}

docker_command_by_container_image() {
  IMAGE_NAME=$1
  COMMAND=$2
  if  [[ -n "${IMAGE_NAME}" ]]; then
    CONTAINERS="$(docker ps -a | grep "${IMAGE_NAME}" | awk '{print $1}')"
    for CONTAINER_ID in $CONTAINERS; do
      if [[ -n "${CONTAINER_ID}" ]] && [[ -n "${COMMAND}" ]]; then
        bash -c "docker ${COMMAND} ${CONTAINER_ID}"
      fi
    done
  fi
}


stop_containers() {
  printf "Stopping containers..."
  for IMAGE in "${IMAGES[@]}"; do
    docker_command_by_container_image "${IMAGE}" "rm -f"
  done
}

new_media_node_installation() {
     printf '\n'
     printf '\n     ======================================='
     printf '\n          Install Media Node %s' "${MEDIA_NODE_VERSION}"
     printf '\n     ======================================='
     printf '\n'

     # Create kms folder
     printf '\n     => Creating folder '%s'...' "${MEDIA_NODE_FOLDER}"
     mkdir "${MEDIA_NODE_FOLDER}" || fatal_error "Error while creating the folder '${MEDIA_NODE_FOLDER}'"

     # Create beats folder
     printf '\n     => Creating folder '%s'...' "${BEATS_FOLDER}"
     mkdir "${BEATS_FOLDER}" || fatal_error "Error while creating the folder 'beats'"

     # Download necessaries files
     printf '\n     => Downloading Media Node files:'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/docker-compose.yml \
          --output "${MEDIA_NODE_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/media_node \
          --output "${MEDIA_NODE_FOLDER}/media_node" || fatal_error "Error when downloading the file 'media_node'"
     printf '\n          - media_node'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/beats/filebeat.yml \
          --output "${BEATS_FOLDER}/filebeat.yml" || fatal_error "Error when downloading the file 'filebeat.yml'"
     printf '\n          - filebeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/beats/metricbeat-elasticsearch.yml \
          --output "${BEATS_FOLDER}/metricbeat-elasticsearch.yml" || fatal_error "Error when downloading the file 'metricbeat-elasticsearch.yml'"
     printf '\n          - metricbeat-elasticsearch.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/beats/copy_config_files.sh \
          --output "${BEATS_FOLDER}/copy_config_files.sh" || fatal_error "Error when downloading the file 'copy_config_files.sh'"
     printf '\n          - copy_config_files.sh'

     # Add execution permissions
     printf "\n     => Adding permission to 'media_node' program..."
     chmod +x "${MEDIA_NODE_FOLDER}/media_node" || fatal_error "Error while adding permission to 'media_node' program"

     # Change recording folder with all permissions
     printf "\n     => Adding permission to 'recordings' folder..."
     mkdir -p "${OPENVIDU_RECORDINGS_FOLDER}"
     chmod 777 "${OPENVIDU_RECORDINGS_FOLDER}"

     # Add execution permissions
     printf "\n     => Adding permission to 'copy_config_files.sh' script..."
     chmod +x "${MEDIA_NODE_FOLDER}/beats/copy_config_files.sh" || fatal_error "Error while adding permission to 'copy_config_files.sh' script"

     # Pull images
     printf "\n     => Pulling images...\n"
     cd "${MEDIA_NODE_FOLDER}" || fatal_error "Error when moving to '${MEDIA_NODE_FOLDER}' folder"
     KMS_IMAGE=$(grep KMS_IMAGE docker-compose.yml | cut -d"=" -f2)
     MEDIASOUP_IMAGE=$(grep MEDIASOUP_IMAGE docker-compose.yml | cut -d"=" -f2)
     METRICBEAT_IMAGE=$(grep METRICBEAT_IMAGE docker-compose.yml | cut -d"=" -f2)
     FILEBEAT_IMAGE=$(grep FILEBEAT_IMAGE docker-compose.yml | cut -d"=" -f2)
     OPENVIDU_RECORDING_IMAGE=$(grep OPENVIDU_RECORDING_IMAGE docker-compose.yml | cut -d"=" -f2)
     COTURN_IMAGE="$(grep COTURN_IMAGE docker-compose.yml | cut -d"=" -f2)"
     SPEECH_TO_TEXT_IMAGE=$(grep SPEECH_TO_TEXT_IMAGE docker-compose.yml | cut -d"=" -f2)
     docker pull "$KMS_IMAGE" || fatal "Error while pulling docker image: $KMS_IMAGE"
     docker pull "$MEDIASOUP_IMAGE" || fatal "Error while pulling docker image: $MEDIASOUP_IMAGE"
     docker pull "$METRICBEAT_IMAGE" || fatal "Error while pulling docker image: $METRICBEAT_IMAGE"
     docker pull "$FILEBEAT_IMAGE" || fatal "Error while pulling docker image: $FILEBEAT_IMAGE"
     docker pull "$OPENVIDU_RECORDING_IMAGE" || fatal "Error while pulling docker image: $OPENVIDU_RECORDING_IMAGE"
     docker pull "$COTURN_IMAGE" || fatal "Error while pulling docker image: $COTURN_IMAGE"
     docker pull "$SPEECH_TO_TEXT_IMAGE" || fatal "Error while pulling docker image: $SPEECH_TO_TEXT_IMAGE"
     docker-compose pull || true

     # Ready to use
     printf "\n"
     printf '\n     ======================================='
     printf "\n          Media Node successfully installed."
     printf '\n     ======================================='
     printf '\n'
     printf '\n     1. Go to kms folder:'
     printf '\n     $ cd kms'
     printf '\n'
     printf '\n     2. Start Media Node Controller'
     printf '\n     $ ./media_node start'
     printf '\n'
     printf '\n     3. This will run a service at port 3000 which OpenVidu will use to deploy necessary containers.'
     printf '\n     Add the private ip of this media node in "KMS_URIS=[]" in OpenVidu Pro machine'
     printf '\n     in file located at "/opt/openvidu/.env" with this format:'
     printf '\n            ...'
     printf '\n            KMS_URIS=["ws://<MEDIA_NODE_PRIVATE_IP>:8888/kurento"]'
     printf '\n            ...'
     printf '\n     You can also add this node from inspector'
     printf '\n'
     printf '\n     4. Start or restart OpenVidu Pro and all containers will be provisioned'
     printf '\n     automatically to all the media nodes configured in "KMS_URIS"'
     printf '\n     More info about Media Nodes deployment here:'
     printf '\n     --> https://docs.openvidu.io/en/%s/openvidu-pro/deployment/on-premises/#set-the-number-of-media-nodes-on-startup' "${OPENVIDU_VERSION//v}"
     printf '\n'
     printf '\n'
     printf "\n     If you want to rollback, all the files from the previous installation have been copied to folder '.old-%s'" "${OPENVIDU_PREVIOUS_VERSION}"
     printf '\n'
     exit 0
}

upgrade_media_node() {
 # Search local Openvidu installation
     printf '\n'
     printf '\n     ============================================'
     printf '\n      Search Previous Installation of Media Node'
     printf '\n     ============================================'
     printf '\n'

     SEARCH_IN_FOLDERS=(
          "${PWD}"
          "/opt/${MEDIA_NODE_FOLDER}"
     )

     for folder in "${SEARCH_IN_FOLDERS[@]}"; do
          printf "\n     => Searching in '%s' folder..." "${folder}"

          if [ -f "${folder}/docker-compose.yml" ]; then
               MEDIA_NODE_PREVIOUS_FOLDER="${folder}"

               printf "\n     => Found installation in folder '%s'" "${folder}"
               break
          fi
     done

     [ -z "${MEDIA_NODE_PREVIOUS_FOLDER}" ] && fatal_error "No previous Media Node installation found"

     # Upgrade Media Node
     OPENVIDU_PREVIOUS_VERSION=$(grep 'Openvidu Version:' "${MEDIA_NODE_PREVIOUS_FOLDER}/docker-compose.yml" | awk '{ print $4 }')
     [ -z "${OPENVIDU_PREVIOUS_VERSION}" ] && fatal_error "Can't find previous OpenVidu version"

     # In this point using the variable 'OPENVIDU_PREVIOUS_VERSION' we can verify if the upgrade is
     # posible or not. If it is not posible launch a warning and stop the upgrade.
     if [[ "${OPENVIDU_PREVIOUS_VERSION}" != "${OPENVIDU_UPGRADABLE_VERSION}."* ]]; then
          fatal_error "You can't update from version ${OPENVIDU_PREVIOUS_VERSION} to ${OPENVIDU_VERSION}.\nNever upgrade across multiple major versions."
     fi

     printf '\n'
     printf '\n     ======================================='
     printf '\n       Upgrade Media Node %s to %s' "${OPENVIDU_PREVIOUS_VERSION}" "${MEDIA_NODE_VERSION}"
     printf '\n     ======================================='
     printf '\n'

     ROLL_BACK_FOLDER="${MEDIA_NODE_PREVIOUS_FOLDER}/.old-${OPENVIDU_PREVIOUS_VERSION}"
     TMP_FOLDER="${MEDIA_NODE_PREVIOUS_FOLDER}/tmp"
     ACTUAL_FOLDER="$PWD"

     printf "\n     Creating roll back folder '%s'..." ".old-${OPENVIDU_PREVIOUS_VERSION}"
     mkdir "${ROLL_BACK_FOLDER}" || fatal_error "Error while creating the folder '.old-${OPENVIDU_PREVIOUS_VERSION}'"

     printf "\n     Creating temporal folder 'tmp'..."
     mkdir "${TMP_FOLDER}" || fatal_error "Error while creating the folder 'temporal'"

     # Download necessaries files
     printf '\n     => Downloading new Media Node files:'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/docker-compose.yml \
          --output "${TMP_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/media_node \
          --output "${TMP_FOLDER}/media_node" || fatal_error "Error when downloading the file 'media_node'"
     printf '\n          - media_node'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/beats/filebeat.yml \
          --output "${TMP_FOLDER}/filebeat.yml" || fatal_error "Error when downloading the file 'filebeat.yml'"
     printf '\n          - filebeat.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/beats/metricbeat-elasticsearch.yml \
          --output "${TMP_FOLDER}/metricbeat-elasticsearch.yml" || fatal_error "Error when downloading the file 'metricbeat-elasticsearch.yml'"
     printf '\n          - metricbeat-elasticsearch.yml'

     curl --silent ${DOWNLOAD_URL}/openvidu-server/deployments/pro/docker-compose/media-node/beats/copy_config_files.sh \
          --output "${TMP_FOLDER}/copy_config_files.sh" || fatal_error "Error when downloading the file 'copy_config_files.sh'"
     printf '\n          - copy_config_files.sh'

     # Downloading new images and stopped actual Media Node
     printf '\n     => Downloading new images...'
     printf '\n'
     sleep 1

     printf "\n          => Moving to 'tmp' folder..."
     printf '\n'
     cd "${TMP_FOLDER}" || fatal_error "Error when moving to '${TMP_FOLDER}' folder"

     printf '\n     => Stopping Media Node containers...'
     printf '\n'
     sleep 1

     stop_containers

     # Pull images
     printf "\n     => Pulling images...\n"
     KMS_IMAGE="$(grep KMS_IMAGE docker-compose.yml | cut -d"=" -f2)"
     MEDIASOUP_IMAGE="$(grep MEDIASOUP_IMAGE docker-compose.yml | cut -d"=" -f2)"
     METRICBEAT_IMAGE="$(grep METRICBEAT_IMAGE docker-compose.yml | cut -d"=" -f2)"
     FILEBEAT_IMAGE="$(grep FILEBEAT_IMAGE docker-compose.yml | cut -d"=" -f2)"
     OPENVIDU_RECORDING_IMAGE="$(grep OPENVIDU_RECORDING_IMAGE docker-compose.yml | cut -d"=" -f2)"
     SPEECH_TO_TEXT_IMAGE="$(grep SPEECH_TO_TEXT_IMAGE docker-compose.yml | cut -d"=" -f2)"
     COTURN_IMAGE="$(grep COTURN_IMAGE docker-compose.yml | cut -d"=" -f2)"

     docker pull "$KMS_IMAGE" || fatal "Error while pulling docker image: $KMS_IMAGE"
     docker pull "$MEDIASOUP_IMAGE" || fatal "Error while pulling docker image: $MEDIASOUP_IMAGE"
     docker pull "$METRICBEAT_IMAGE" || fatal "Error while pulling docker image: $METRICBEAT_IMAGE"
     docker pull "$FILEBEAT_IMAGE" || fatal "Error while pulling docker image: $FILEBEAT_IMAGE"
     docker pull "$OPENVIDU_RECORDING_IMAGE" || fatal "Error while pulling docker image: $OPENVIDU_RECORDING_IMAGE"
     docker pull "$COTURN_IMAGE" || fatal "Error while pulling docker image: $COTURN_IMAGE"
     docker pull "$SPEECH_TO_TEXT_IMAGE" || fatal "Error while pulling docker image: $SPEECH_TO_TEXT_IMAGE"
     docker-compose pull || true

     printf '\n     => Stopping Media Node...'
     printf '\n'
     sleep 1

     printf "\n          => Moving to 'openvidu' folder..."
     printf '\n'
     cd "${MEDIA_NODE_PREVIOUS_FOLDER}" || fatal_error "Error when moving to 'openvidu' folder"
     docker-compose down || true

     printf '\n'
     printf '\n     => Moving to working dir...'
     cd "${ACTUAL_FOLDER}" || fatal_error "Error when moving to working dir"

     # Move old files to roll back folder
     printf '\n     => Moving previous installation files to rollback folder:'

     mv "${MEDIA_NODE_PREVIOUS_FOLDER}/docker-compose.yml" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     mv "${MEDIA_NODE_PREVIOUS_FOLDER}/media_node" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'openvidu'"
     printf '\n          - media_node'

     mv "${MEDIA_NODE_PREVIOUS_FOLDER}/beats" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'beats' folder"
     printf '\n          - beats'

     # Move tmp files to Openvidu
     printf '\n     => Updating files:'

     mv "${TMP_FOLDER}/docker-compose.yml" "${MEDIA_NODE_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     mv "${TMP_FOLDER}/media_node" "${MEDIA_NODE_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'media_node'"
     printf '\n          - media_node'

     mkdir "${MEDIA_NODE_PREVIOUS_FOLDER}/beats" || fatal_error "Error while creating the folder 'beats'"

     mv "${TMP_FOLDER}/filebeat.yml" "${MEDIA_NODE_PREVIOUS_FOLDER}/beats" || fatal_error "Error while updating 'filebeat.yml'"
     printf '\n          - filebeat.yml'

     mv "${TMP_FOLDER}/metricbeat-elasticsearch.yml" "${MEDIA_NODE_PREVIOUS_FOLDER}/beats" || fatal_error "Error while updating 'metricbeat-elasticsearch.yml'"
     printf '\n          - metricbeat-elasticsearch.yml'

     mv "${TMP_FOLDER}/copy_config_files.sh" "${MEDIA_NODE_PREVIOUS_FOLDER}/beats" || fatal_error "Error while updating 'copy_config_files.sh'"
     printf '\n          - copy_config_files.sh'

     printf "\n     => Deleting 'tmp' folder"
     rm -rf "${TMP_FOLDER}" || fatal_error "Error deleting 'tmp' folder"

     # Add execution permissions
     printf "\n     => Adding permission to 'media_node' program..."
     chmod +x "${MEDIA_NODE_PREVIOUS_FOLDER}/media_node" || fatal_error "Error while adding permission to 'media_node' program"

     # Change recording folder with all permissions
     printf "\n     => Adding permission to 'recordings' folder..."
     mkdir -p "${OPENVIDU_RECORDINGS_FOLDER}"
     chmod 777 "${OPENVIDU_RECORDINGS_FOLDER}"

     # Add execution permissions
     printf "\n     => Adding permission to 'copy_config_files.sh' script..."
     chmod +x "${MEDIA_NODE_PREVIOUS_FOLDER}/beats/copy_config_files.sh" || fatal_error "Error while adding permission to 'copy_config_files.sh' script"

     # Define old mode: On Premise or Cloud Formation
     OLD_MODE=$(grep -E "Installation Mode:.*$" "${ROLL_BACK_FOLDER}/docker-compose.yml" | awk '{ print $4,$5 }')
     [ -n "${OLD_MODE}" ] && sed -i -r "s/Installation Mode:.+/Installation Mode: ${OLD_MODE}/" "${MEDIA_NODE_PREVIOUS_FOLDER}/docker-compose.yml"

     # Ready to use
     printf '\n'
     printf '\n'
     printf '\n     ================================================'
     printf "\n     Openvidu successfully upgraded to version %s" "${OPENVIDU_VERSION}"
     printf '\n     ================================================'
     printf '\n'
     printf "\n     1. A new file 'docker-compose.yml' has been created with the new OpenVidu %s services" "${OPENVIDU_VERSION}"
     printf '\n'
     printf "\n     2. This new version %s does not need any .env file. Everything is configured from OpenVidu Pro" "${OPENVIDU_VERSION}"
     printf '\n'
     printf '\n     3. Start new version of Media Node'
     printf '\n     $ ./media_node start'
     printf '\n'
     printf '\n     4. This will run a service at port 3000 which OpenVidu will use to deploy necessary containers.'
     printf '\n     Add the private ip of this media node in "KMS_URIS=[]" in OpenVidu Pro machine'
     printf '\n     in file located at "/opt/openvidu/.env" with this format:'
     printf '\n            ...'
     printf '\n            KMS_URIS=["ws://<MEDIA_NODE_PRIVATE_IP>:8888/kurento"]'
     printf '\n            ...'
     printf '\n     You can also add Media Nodes from inspector'
     printf '\n'
     printf '\n     5. Start or restart OpenVidu Pro and all containers will be provisioned'
     printf '\n     automatically to all the media nodes configured in "KMS_URIS"'
     printf '\n     More info about Media Nodes deployment here:'
     printf '\n     --> https://docs.openvidu.io/en/%s/openvidu-pro/deployment/on-premises/#set-the-number-of-media-nodes-on-startup' "${OPENVIDU_VERSION//v}"
     printf '\n'
     printf '\n'
     printf "\n     If you want to rollback, all the files from the previous installation have been copied to folder '.old-%s'" "${OPENVIDU_PREVIOUS_VERSION}"
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
     upgrade_media_node
else
     new_media_node_installation
fi
