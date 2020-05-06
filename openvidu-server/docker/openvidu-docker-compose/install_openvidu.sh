#!/usr/bin/env bash

# Global variables
OPENVIDU_FOLDER=openvidu
OPENVIDU_VERSION=master

fatal_error() {
     printf "\n     =======¡ERROR!======="
     printf "\n     %s" "$1"
     printf "\n"
     exit 0
}

new_ov_installation() {
     printf '\n'
     printf '\n     ======================================='
     printf '\n          Install Openvidu CE %s' "${OPENVIDU_VERSION}"
     printf '\n     ======================================='
     printf '\n'

     # Create folder openvidu-docker-compose
     printf '\n     => Creating folder '%s'...' "${OPENVIDU_FOLDER}"
     mkdir "${OPENVIDU_FOLDER}" || fatal_error "Error while creating the folder '${OPENVIDU_FOLDER}'"

     # Download necessaries files
     printf '\n     => Downloading Openvidu CE files:'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/.env \
          --output "${OPENVIDU_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
     printf '\n          - .env'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/docker-compose.override.yml \
          --output "${OPENVIDU_FOLDER}/docker-compose.override.yml" || fatal_error "Error when downloading the file 'docker-compose.override.yml'"
     printf '\n          - docker-compose.override.yml'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/docker-compose.yml \
          --output "${OPENVIDU_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'   

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/openvidu \
          --output "${OPENVIDU_FOLDER}/openvidu" || fatal_error "Error when downloading the file 'openvidu'"
     printf '\n          - openvidu'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/readme.md \
          --output "${OPENVIDU_FOLDER}/readme.md" || fatal_error "Error when downloading the file 'readme.md'"
     printf '\n          - readme.md'

     # Add execution permissions
     printf "\n     => Adding permission to 'openvidu' program..."
     chmod +x "${OPENVIDU_FOLDER}/openvidu" || fatal_error "Error while adding permission to 'openvidu' program"

     # Create own certificated folder
     printf "\n     => Creating folder 'owncert'..."
     mkdir "${OPENVIDU_FOLDER}/owncert" || fatal_error "Error while creating the folder 'owncert'"

     # Ready to use
     printf '\n'
     printf '\n'
     printf '\n     ======================================='
     printf '\n     Openvidu Platform successfully installed.'
     printf '\n     ======================================='
     printf '\n'
     printf '\n     1. Go to openvidu folder:'
     printf '\n     $ cd openvidu'
     printf '\n'
     printf '\n     2. Configure DOMAIN_OR_PUBLIC_IP and OPENVIDU_SECRET in .env file:'
     printf '\n     $ nano .env' 
     printf '\n'
     printf '\n     3. Start OpenVidu'
     printf '\n     $ ./openvidu start'
     printf '\n'
     printf '\n     For more information, check readme.md'
     printf '\n'
     printf '\n'
     exit 0
}

upgrade_ov() {
     # Search local Openvidu installation
     printf '\n'
     printf '\n     ============================================'
     printf '\n       Search Previous Installation of Openvidu'
     printf '\n     ============================================'
     printf '\n'

     SEARCH_IN_FOLDERS=(
          "." 
          "/opt/openvidu"
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

     # Uppgrade Openvidu
     OPENVIDU_PREVIOUS_VERSION=$(grep 'Openvidu Version:' "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml" | awk '{ print $4 }')
     [ -z "${OPENVIDU_PREVIOUS_VERSION}" ] && OPENVIDU_PREVIOUS_VERSION=2.13.0

     # In this point using the variable 'OPENVIDU_PREVIOUS_VERSION' we can verify if the upgrade is 
     # posible or not. If it is not posible launch a warning and stop the upgrade.

     printf '\n'
     printf '\n     ======================================='
     printf '\n       Upgrade Openvidu CE %s to %s' "${OPENVIDU_PREVIOUS_VERSION}" "${OPENVIDU_VERSION}"
     printf '\n     ======================================='
     printf '\n'

     ROLL_BACK_FOLDER="${OPENVIDU_PREVIOUS_FOLDER}/.old-${OPENVIDU_PREVIOUS_VERSION}"
     TMP_FOLDER="${OPENVIDU_PREVIOUS_FOLDER}/tmp"
     USE_OV_CALL=$(grep -E '^        image: openvidu/openvidu-call:2.12.0$' "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.override.yml" | tr -d '[:space:]')

     printf "\n     Creating roll back folder '%s'..." ".old-${OPENVIDU_PREVIOUS_VERSION}"
     mkdir "${ROLL_BACK_FOLDER}" || fatal_error "Error while creating the folder '.old-${OPENVIDU_PREVIOUS_VERSION}'"

     printf "\n     Creating temporal folder 'tmp'..."
     mkdir "${TMP_FOLDER}" || fatal_error "Error while creating the folder 'temporal'"

     # Download necessaries files
     printf '\n     => Downloading new Openvidu CE files:'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/docker-compose.yml \
          --output "${TMP_FOLDER}/docker-compose.yml" || fatal_error "Error when downloading the file 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/docker-compose.override.yml \
          --output "${TMP_FOLDER}/docker-compose.override.yml" || fatal_error "Error when downloading the file 'docker-compose.override.yml'"
     printf "\n          - docker-compose.override.yml"

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/.env \
          --output "${TMP_FOLDER}/.env" || fatal_error "Error when downloading the file '.env'"
     printf '\n          - .env'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/openvidu \
          --output "${TMP_FOLDER}/openvidu" || fatal_error "Error when downloading the file 'openvidu'"
     printf '\n          - openvidu'

     curl --silent https://raw.githubusercontent.com/OpenVidu/openvidu/${OPENVIDU_VERSION}/openvidu-server/docker/openvidu-docker-compose/readme.md \
          --output "${TMP_FOLDER}/readme.md" || fatal_error "Error when downloading the file 'readme.md'"
     printf '\n          - readme.md'

     # Dowloading new images and stoped actual Openvidu
     printf '\n     => Dowloading new images...'
     printf '\n'
     sleep 1

     [ -f "${TMP_FOLDER}/docker-compose.yml" ] && docker-compose -f "${TMP_FOLDER}/docker-compose.yml" pull
     [ -f "${TMP_FOLDER}/docker-compose.override.yml" ] && docker-compose -f "${TMP_FOLDER}/docker-compose.override.yml" pull
     
     printf '\n     => Stoping Openvidu...'
     printf '\n'
     sleep 1

     docker-compose down
     printf '\n'

     # Move old files to roll back folder
     printf '\n     => Moving previous installation files to rollback folder:'

     mv "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.yml" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     if [ ! -z "${USE_OV_CALL}" ]; then
          mv "${OPENVIDU_PREVIOUS_FOLDER}/docker-compose.override.yml" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'docker-compose.override.yml'"
          printf '\n          - docker-compose.override.yml'
     fi

     mv "${OPENVIDU_PREVIOUS_FOLDER}/openvidu" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'openvidu'"
     printf '\n          - openvidu'

     mv "${OPENVIDU_PREVIOUS_FOLDER}/readme.md" "${ROLL_BACK_FOLDER}" || fatal_error "Error while moving previous 'readme.md'"
     printf '\n          - readme.md'

     # Move tmp files to Openvidu
     printf '\n     => Updating files:'

     mv "${TMP_FOLDER}/docker-compose.yml" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'docker-compose.yml'"
     printf '\n          - docker-compose.yml'

     if [ ! -z "${USE_OV_CALL}" ]; then
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

     mv "${TMP_FOLDER}/readme.md" "${OPENVIDU_PREVIOUS_FOLDER}" || fatal_error "Error while updating 'readme.md'"
     printf '\n          - readme.md'

     printf "\n     => Deleting 'tmp' folder"
     rm -rf "${TMP_FOLDER}" || fatal_error "Error deleting 'tmp' folder"

     # Add execution permissions
     printf "\n     => Adding permission to 'openvidu' program..."
     chmod +x "${OPENVIDU_PREVIOUS_FOLDER}/openvidu" || fatal_error "Error while adding permission to 'openvidu' program"

     # Ready to use
     printf '\n'
     printf '\n'
     printf '\n     ======================================='
     printf '\n     Openvidu Platform successfully upgrade.'
     printf '\n     ======================================='
     printf '\n'
     printf "\n     1. A new file 'docker-compose.yml' has been created with the new services"
     printf '\n'
     printf "\n     2. The current file '.env' has been kept but a new file '.env-VERSION' has been created." 
     printf "\n     Please check the new file '.env-VERSION' use your data from the file '.env' and replace it"
     printf '\n     to have the new improvements.' 
     printf '\n'
     printf "\n     3. If you were using Openvidu Call it has been updated in the file 'docker-compose.override.yml'"
     printf "\n     however if you are using your own application a file called 'docker-compose.override.yml-VERSION'"
     printf "\n     has been created with the latest version of Openvidu Call, you can delete it or use it if you wish."
     printf '\n'
     printf '\n     4. Start new version of Openvidu'
     printf '\n     $ ./openvidu start'
     printf '\n'
     printf '\n     For more information, check readme.md'
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
if [[ ! -z "$1" && "$1" == "upgrade" ]]; then
     upgrade_ov
else
     new_ov_installation
fi
