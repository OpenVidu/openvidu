#!/bin/sh
set -eu
export INSTALL_PREFIX="${INSTALL_PREFIX:-/opt/openvidu}"
export DOCKER_VERSION="${DOCKER_VERSION:-29.0.2}"
export DOCKER_COMPOSE_VERSION="${DOCKER_COMPOSE_VERSION:-v2.40.3}"
export OPENVIDU_VERSION="${OPENVIDU_VERSION:-main}"
export UPDATER_IMAGE="${UPDATER_IMAGE:-docker.io/openvidu/openvidu-updater:${OPENVIDU_VERSION}}"
export MINIO_SERVER_IMAGE="${MINIO_SERVER_IMAGE:-docker.io/openvidu/minio:2025.9.7-debian-12-r3}"
export MINIO_CLIENT_IMAGE="${MINIO_CLIENT_IMAGE:-docker.io/minio/mc:RELEASE.2025-08-13T08-35-41Z}"
export MONGO_SERVER_IMAGE="${MONGO_SERVER_IMAGE:-docker.io/mongo:8.0.15}"
export REDIS_SERVER_IMAGE="${REDIS_SERVER_IMAGE:-docker.io/redis:8.2.2-alpine}"
export BUSYBOX_IMAGE="${BUSYBOX_IMAGE:-docker.io/busybox:1.37.0}"
export CADDY_SERVER_IMAGE="${CADDY_SERVER_IMAGE:-docker.io/openvidu/openvidu-caddy:${OPENVIDU_VERSION}}"
export CADDY_SERVER_PRO_IMAGE="${CADDY_SERVER_PRO_IMAGE:-docker.io/openvidu/openvidu-pro-caddy:${OPENVIDU_VERSION}}"
export OPENVIDU_OPERATOR_IMAGE="${OPENVIDU_OPERATOR_IMAGE:-docker.io/openvidu/openvidu-operator:${OPENVIDU_VERSION}}"
export OPENVIDU_SERVER_PRO_IMAGE="${OPENVIDU_SERVER_PRO_IMAGE:-docker.io/openvidu/openvidu-server-pro:${OPENVIDU_VERSION}}"
export OPENVIDU_SERVER_IMAGE="${OPENVIDU_SERVER_IMAGE:-docker.io/openvidu/openvidu-server:${OPENVIDU_VERSION}}"
export OPENVIDU_MEET_SERVER_IMAGE="${OPENVIDU_MEET_SERVER_IMAGE:-docker.io/openvidu/openvidu-meet:${OPENVIDU_VERSION}}"
export OPENVIDU_DASHBOARD_PRO_IMAGE="${OPENVIDU_DASHBOARD_PRO_IMAGE:-docker.io/openvidu/openvidu-pro-dashboard:${OPENVIDU_VERSION}}"
export OPENVIDU_DASHBOARD_IMAGE="${OPENVIDU_DASHBOARD_IMAGE:-docker.io/openvidu/openvidu-dashboard:${OPENVIDU_VERSION}}"
export OPENVIDU_V2COMPATIBILITY_IMAGE="${OPENVIDU_V2COMPATIBILITY_IMAGE:-docker.io/openvidu/openvidu-v2compatibility:${OPENVIDU_VERSION}}"
export OPENVIDU_AGENT_SPEECH_PROCESSING_IMAGE="${OPENVIDU_AGENT_SPEECH_PROCESSING_IMAGE:-docker.io/openvidu/agent-speech-processing-vosk:${OPENVIDU_VERSION}}"
export OPENVIDU_AGENT_PRO_SPEECH_PROCESSING_IMAGE="${OPENVIDU_AGENT_PRO_SPEECH_PROCESSING_IMAGE:-docker.io/openvidu/agent-speech-processing-sherpa:${OPENVIDU_VERSION}}"
export LIVEKIT_INGRESS_SERVER_IMAGE="${LIVEKIT_INGRESS_SERVER_IMAGE:-docker.io/openvidu/ingress:${OPENVIDU_VERSION}}"
export LIVEKIT_EGRESS_SERVER_IMAGE="${LIVEKIT_EGRESS_SERVER_IMAGE:-docker.io/openvidu/egress:${OPENVIDU_VERSION}}"
export PROMETHEUS_IMAGE="${PROMETHEUS_IMAGE:-docker.io/prom/prometheus:v3.7.1}"
export PROMTAIL_IMAGE="${PROMTAIL_IMAGE:-docker.io/grafana/promtail:3.5.7}"
export LOKI_IMAGE="${LOKI_IMAGE:-docker.io/grafana/loki:3.5.7}"
export MIMIR_IMAGE="${MIMIR_IMAGE:-docker.io/openvidu/grafana-mimir:2.17.1}"
export GRAFANA_IMAGE="${GRAFANA_IMAGE:-docker.io/grafana/grafana:12.2.0}"

get_next_version() {
  case "$1" in
    "3.0.0") echo "3.1.0" ;;
    "3.1.0") echo "3.2.0" ;;
    "3.2.0") echo "3.3.0" ;;
    "3.3.0") echo "3.4.0" ;;
    "3.4.0") echo "3.4.1" ;;
    "3.4.1") echo "3.5.0" ;;
    *) echo "" ;;
  esac
}

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

# Validate upgrade path
validate_upgrade() {
  current="$1"
  target="$2"

  if [ "$target" = "main" ]; then
    echo "WARNING: You are trying to upgrade to 'main' version."
    echo "This version is for OpenVidu developers and may be unstable."
    printf "Are you sure you want to continue? [y/N]: "
    read -r response
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
      echo "Update cancelled"
      exit 1
    fi
    return 0
  fi

  next_version="$(get_next_version "$current")"
  if [ -z "$next_version" ]; then
    echo "ERROR: No upgrade path defined for version $current"
    exit 1
  fi

  if [ "$target" = "$next_version" ]; then
    return 0
  else
    echo "ERROR: Version $current can only be upgraded to version $next_version"
    echo "Please upgrade first to version $next_version"
    echo "You can do it by running the following command:"
    echo ""
    echo ""
    echo "    sh <(curl -fsSL http://get.openvidu.io/update/$next_version/update.sh)"
    echo ""
    echo ""
    exit 1
  fi
}

# Check if executing as root
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Validate the upgrade path
CURRENT_VERSION="$(grep version "${INSTALL_PREFIX}/deployment-info.yaml" | cut -d':' -f2 | sed 's/^ *"//;s/"$//')"
validate_upgrade "$CURRENT_VERSION" "$OPENVIDU_VERSION"

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

# Check if docker is running with docker info
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Starting Docker..."
  systemctl enable docker
  systemctl start docker
  wait_for_docker
fi

# Pull updater image
docker pull "${UPDATER_IMAGE}"

# Temporary directory for post-update script
TMP_DIR=$(mktemp -d)

# Generate installation scripts
COMMON_DOCKER_OPTIONS="--network=host \
    -v ${INSTALL_PREFIX}:${INSTALL_PREFIX} \
    -v ${TMP_DIR}:${TMP_DIR} \
    -e OPENVIDU_VERSION=$OPENVIDU_VERSION \
    -e CADDY_SERVER_IMAGE=$CADDY_SERVER_IMAGE \
    -e CADDY_SERVER_PRO_IMAGE=$CADDY_SERVER_PRO_IMAGE \
    -e MINIO_SERVER_IMAGE=$MINIO_SERVER_IMAGE \
    -e MINIO_CLIENT_IMAGE=$MINIO_CLIENT_IMAGE \
    -e MONGO_SERVER_IMAGE=$MONGO_SERVER_IMAGE \
    -e REDIS_SERVER_IMAGE=$REDIS_SERVER_IMAGE \
    -e BUSYBOX_IMAGE=$BUSYBOX_IMAGE \
    -e OPENVIDU_OPERATOR_IMAGE=$OPENVIDU_OPERATOR_IMAGE \
    -e OPENVIDU_SERVER_PRO_IMAGE=$OPENVIDU_SERVER_PRO_IMAGE \
    -e OPENVIDU_SERVER_IMAGE=$OPENVIDU_SERVER_IMAGE \
    -e OPENVIDU_MEET_SERVER_IMAGE=$OPENVIDU_MEET_SERVER_IMAGE \
    -e OPENVIDU_DASHBOARD_PRO_IMAGE=$OPENVIDU_DASHBOARD_PRO_IMAGE \
    -e OPENVIDU_DASHBOARD_IMAGE=$OPENVIDU_DASHBOARD_IMAGE \
    -e OPENVIDU_V2COMPATIBILITY_IMAGE=$OPENVIDU_V2COMPATIBILITY_IMAGE \
    -e OPENVIDU_AGENT_SPEECH_PROCESSING_IMAGE=$OPENVIDU_AGENT_SPEECH_PROCESSING_IMAGE \
    -e OPENVIDU_AGENT_PRO_SPEECH_PROCESSING_IMAGE=$OPENVIDU_AGENT_PRO_SPEECH_PROCESSING_IMAGE \
    -e LIVEKIT_INGRESS_SERVER_IMAGE=$LIVEKIT_INGRESS_SERVER_IMAGE \
    -e LIVEKIT_EGRESS_SERVER_IMAGE=$LIVEKIT_EGRESS_SERVER_IMAGE \
    -e PROMETHEUS_IMAGE=$PROMETHEUS_IMAGE \
    -e PROMTAIL_IMAGE=$PROMTAIL_IMAGE \
    -e LOKI_IMAGE=$LOKI_IMAGE \
    -e MIMIR_IMAGE=$MIMIR_IMAGE \
    -e GRAFANA_IMAGE=$GRAFANA_IMAGE \
    ${UPDATER_IMAGE} \
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
