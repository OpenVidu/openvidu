#!/bin/sh
set -eu
export INSTALL_PREFIX="${INSTALL_PREFIX:-/opt/openvidu}"
export DOCKER_VERSION="${DOCKER_VERSION:-28.3.3}"
export DOCKER_COMPOSE_VERSION="${DOCKER_COMPOSE_VERSION:-v2.39.4}"
export OPENVIDU_VERSION="${OPENVIDU_VERSION:-main}"
export REGISTRY="${REGISTRY:-docker.io}"
export UPDATER_IMAGE="${UPDATER_IMAGE:-${REGISTRY}/openvidu/openvidu-updater:${OPENVIDU_VERSION}}"

# Function to compare two version strings
compare_versions() {
    # Remove 'v' prefix if present
    VERSION1=$(echo "$1" | sed 's/^v//')
    VERSION2=$(echo "$2" | sed 's/^v//')

    # Compare versions
    if [ "$(printf '%s\n' "$VERSION1" "$VERSION2" | sort -V | head -n1)" = "$VERSION1" ]; then
        if [ "$VERSION1" = "$VERSION2" ]; then
            echo "equal"
        else
            echo "lower"
        fi
    else
        echo "higher"
    fi
}


wait_for_docker() {
    echo "Waiting for Docker to start..."

    # Set a countdown (in seconds)
    COUNTDOWN=60

    while [ "$COUNTDOWN" -gt 0 ]; do
        if docker info >/dev/null 2>&1; then
            echo "Docker started successfully."
            break
        else
            # Reduce the countdown by 1 each iteration.
            COUNTDOWN=$(( COUNTDOWN - 1 ))

            if [ "$COUNTDOWN" -eq 0 ]; then
                echo "ERROR: Docker did not start within the allocated time."
                break
            fi

            sleep 1
        fi
    done
}

# Check if executing as root
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Stop OpenVidu service
echo "Stopping OpenVidu service..."
systemctl stop openvidu

# Check Docker installation and version
DOCKER_NEEDED=false
if ! command -v docker > /dev/null 2>&1; then
  echo "Docker not found. Will install Docker version ${DOCKER_VERSION}."
  DOCKER_NEEDED=true
else
  CURRENT_DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  VERSION_COMPARISON=$(compare_versions "$CURRENT_DOCKER_VERSION" "$DOCKER_VERSION")

  if [ "$VERSION_COMPARISON" = "lower" ]; then
    echo "Docker version $CURRENT_DOCKER_VERSION is older than required version $DOCKER_VERSION."
    echo "Please update Docker to version $DOCKER_VERSION or later."
    exit 1
  else
    echo "Docker version $CURRENT_DOCKER_VERSION is compatible with required version $DOCKER_VERSION."
  fi
fi

# Install Docker if needed
if [ "$DOCKER_NEEDED" = true ]; then
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh --version "${DOCKER_VERSION}" || { echo "Can't install Docker automatically. Install it manually and run this script again"; exit 1; }
fi

# Check Docker Compose installation and version
DOCKER_COMPOSE_NEEDED=false
if ! command -v docker-compose > /dev/null 2>&1; then
  echo "Docker Compose not found. Will install Docker Compose version ${DOCKER_COMPOSE_VERSION}."
  DOCKER_COMPOSE_NEEDED=true
else
  CURRENT_DC_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  # Add 'v' prefix for proper comparison
  CURRENT_DC_VERSION="v${CURRENT_DC_VERSION}"
  VERSION_COMPARISON=$(compare_versions "$CURRENT_DC_VERSION" "$DOCKER_COMPOSE_VERSION")

  if [ "$VERSION_COMPARISON" = "lower" ]; then
    echo "Docker Compose version $CURRENT_DC_VERSION is older than required version $DOCKER_COMPOSE_VERSION."
    echo "Will update Docker Compose to version $DOCKER_COMPOSE_VERSION."
    DOCKER_COMPOSE_NEEDED=true
  else
    echo "Docker Compose version $CURRENT_DC_VERSION is compatible with required version $DOCKER_COMPOSE_VERSION."
  fi
fi

# Install or update Docker Compose if needed
if [ "$DOCKER_COMPOSE_NEEDED" = true ]; then
  TIME_LIMIT_SECONDS=20
  START_TIME=$(awk 'BEGIN{srand(); print srand()}')
  while true
  do
    CURRENT_TIME=$(awk 'BEGIN{srand(); print srand()}')
    if [ $((CURRENT_TIME-START_TIME)) -gt $TIME_LIMIT_SECONDS ]; then
      echo "Error downloading docker-compose. Could not download it in $TIME_LIMIT_SECONDS seconds"
      rm -f /usr/local/bin/docker-compose
      exit 1
    fi
    STATUS_RECEIVED=$(curl --retry 5 --retry-max-time 40 --write-out "%{http_code}\n" -L "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose)
    CURL_EXIT_CODE=$?
    if [ $CURL_EXIT_CODE -ne 0 ]; then
      echo "Error downloading docker-compose. curl failed with exit code $CURL_EXIT_CODE. There are still $((TIME_LIMIT_SECONDS - (CURRENT_TIME - START_TIME))) seconds left to retry..."
      rm -f /usr/local/bin/docker-compose
      sleep 2
      continue
    fi
    if [ "${STATUS_RECEIVED}" -ne "200" ]; then
      echo "Error downloading docker-compose. Received HTTP status code $STATUS_RECEIVED. There are still $((TIME_LIMIT_SECONDS - (CURRENT_TIME - START_TIME))) seconds left to retry..."
      rm -f /usr/local/bin/docker-compose
      sleep 2
      continue
    fi
    echo "Success downloading docker-compose version $DOCKER_COMPOSE_VERSION"
    chmod 755 /usr/local/bin/docker-compose
    break
  done

  # Create a symbolic link to docker-compose in the Docker CLI plugins directory
  # so docker compose can be used also
  mkdir -p /usr/local/lib/docker/cli-plugins
  ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
fi

# Restart Docker and wait for it to start
systemctl enable docker
systemctl stop docker
systemctl start docker
wait_for_docker


# Pull updater image
docker pull "${UPDATER_IMAGE}"

# Temporary directory for post-update script
TMP_DIR=$(mktemp -d)

# Generate installation scripts
COMMON_DOCKER_OPTIONS="--network=host \
    -v ${INSTALL_PREFIX}:${INSTALL_PREFIX} \
    -v ${TMP_DIR}:${TMP_DIR} \
    ${UPDATER_IMAGE} \
    --docker-registry=${REGISTRY} \
    --install-prefix=${INSTALL_PREFIX} \
    --post-update-script="${TMP_DIR}/post-update.sh" \
    $*"

INTERACTIVE_MODE=true
for arg in "$@"; do
  if [ "$arg" = "--no-tty" ]; then
    INTERACTIVE_MODE=false;
    break
  fi
done

if [ "$INTERACTIVE_MODE" = true ]; then
  docker run -it ${COMMON_DOCKER_OPTIONS} > /dev/tty
else
  docker run -i ${COMMON_DOCKER_OPTIONS}
fi

# Trigger in cloud deployments (AWS, Azure, GCP...) a script to update the version of
# OpenVidu Server in their respective shared secret to allow the cluster to run new versions of the Media Nodes.
# In On premises deployments, this script does not exist.
# This script is only executed if the new version is greater or equal than 3.2.0
DEPLOYMENT_ENVIRONMENT="$(grep environment "${INSTALL_PREFIX}/deployment-info.yaml" | cut -d':' -f2 | sed 's/^ *"//;s/"$//')"
if printf '%s\n%s\n' "3.2.0" "$OPENVIDU_VERSION" | sort -V -C; then
  if [ -f /usr/local/bin/store_secret.sh ] &&
    [ "$DEPLOYMENT_ENVIRONMENT" != "on_premise" ]; then
    if [ "$DEPLOYMENT_ENVIRONMENT" = "azure" ]; then
      # In Azure, the secret is named with a hyphen instead of an underscore
      echo "Updating OpenVidu version in Azure..."
      /usr/local/bin/store_secret.sh save OPENVIDU-VERSION "${OPENVIDU_VERSION}"
    else
      echo "Updating OpenVidu version in Cloud provider..."
      /usr/local/bin/store_secret.sh save OPENVIDU_VERSION "${OPENVIDU_VERSION}"
    fi
  fi
fi

if [ -f "${TMP_DIR}/post-update.sh" ]; then
  chmod +x "${TMP_DIR}/post-update.sh"
  "${TMP_DIR}/post-update.sh"
fi
