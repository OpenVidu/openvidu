#!/bin/sh
# Docker & Docker Compose will need to be installed on the machine
set -eu
export DOCKER_VERSION="${DOCKER_VERSION:-29.0.0}"
export DOCKER_COMPOSE_VERSION="${DOCKER_COMPOSE_VERSION:-v2.40.3}"
export OPENVIDU_VERSION="${OPENVIDU_VERSION:-main}"
export INSTALLER_IMAGE="${INSTALLER_IMAGE:-docker.io/openvidu/openvidu-installer:${OPENVIDU_VERSION}}"
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
export OPENVIDU_AGENT_SPEECH_PROCESSING_IMAGE="${OPENVIDU_AGENT_SPEECH_PROCESSING_IMAGE:-docker.io/openvidu/agent-speech-processing:${OPENVIDU_VERSION}}"
export LIVEKIT_INGRESS_SERVER_IMAGE="${LIVEKIT_INGRESS_SERVER_IMAGE:-docker.io/openvidu/ingress:${OPENVIDU_VERSION}}"
export LIVEKIT_EGRESS_SERVER_IMAGE="${LIVEKIT_EGRESS_SERVER_IMAGE:-docker.io/openvidu/egress:${OPENVIDU_VERSION}}"
export PROMETHEUS_IMAGE="${PROMETHEUS_IMAGE:-docker.io/prom/prometheus:v3.7.1}"
export PROMTAIL_IMAGE="${PROMTAIL_IMAGE:-docker.io/grafana/promtail:3.5.7}"
export LOKI_IMAGE="${LOKI_IMAGE:-docker.io/grafana/loki:3.5.7}"
export MIMIR_IMAGE="${MIMIR_IMAGE:-docker.io/openvidu/grafana-mimir:2.17.1}"
export GRAFANA_IMAGE="${GRAFANA_IMAGE:-docker.io/grafana/grafana:12.2.0}"

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

# Create random temp directory
TMP_DIR=$(mktemp -d)
docker pull "${INSTALLER_IMAGE}"

# Generate installation scripts
COMMON_DOCKER_OPTIONS="--network=host -v ${TMP_DIR}:/output \
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
    -e LIVEKIT_INGRESS_SERVER_IMAGE=$LIVEKIT_INGRESS_SERVER_IMAGE \
    -e LIVEKIT_EGRESS_SERVER_IMAGE=$LIVEKIT_EGRESS_SERVER_IMAGE \
    -e PROMETHEUS_IMAGE=$PROMETHEUS_IMAGE \
    -e PROMTAIL_IMAGE=$PROMTAIL_IMAGE \
    -e LOKI_IMAGE=$LOKI_IMAGE \
    -e MIMIR_IMAGE=$MIMIR_IMAGE \
    -e GRAFANA_IMAGE=$GRAFANA_IMAGE \
    ${INSTALLER_IMAGE} \
    --deployment-type=ha \
    --node-role=media-node \
    --install \
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

cd "$TMP_DIR/installation-scripts/openvidu/"
chmod +x install_ov_media_node.sh
./install_ov_media_node.sh

cat finish-message.txt

# Warn about private IP being setup correctly
echo
echo "ATTENTION!!! This is the private IP of this 'Media Node'. Make sure this IP is reachable from all the 'Master Node'"
cat private-ip.txt
echo "If this is not your private IP, reinstall the 'Media Node' with the correct '--private-ip' parameter"

echo
