#!/bin/sh
set -eu


export INSTALL_PREFIX="${INSTALL_PREFIX:-/opt/openvidu}"
export DOCKER_VERSION="${DOCKER_VERSION:-29.4.2}"
export DOCKER_COMPOSE_VERSION="${DOCKER_COMPOSE_VERSION:-v5.1.3}"
export OPENVIDU_VERSION="${OPENVIDU_VERSION:-3.7.0}"
export UPDATE_BASE_URL="${UPDATE_BASE_URL:-http://get.openvidu.io/update}"
export UPDATER_IMAGE="${UPDATER_IMAGE:-docker.io/openvidu/openvidu-updater:${OPENVIDU_VERSION}}"
export MINIO_SERVER_IMAGE="${MINIO_SERVER_IMAGE:-docker.io/openvidu/minio:RELEASE.2026-05-04T00-27-21Z-r0}"
export MINIO_CLIENT_IMAGE="${MINIO_CLIENT_IMAGE:-docker.io/openvidu/minio-client:RELEASE.2026-05-04T15-44-10Z}"
export MONGO_SERVER_IMAGE="${MONGO_SERVER_IMAGE:-docker.io/mongo:8.0.21}"
export REDIS_SERVER_IMAGE="${REDIS_SERVER_IMAGE:-docker.io/redis:8.6.2-alpine}"
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
export PROMETHEUS_IMAGE="${PROMETHEUS_IMAGE:-docker.io/prom/prometheus:v3.11.3}"
export PROMTAIL_IMAGE="${PROMTAIL_IMAGE:-docker.io/grafana/promtail:3.5.12}"
export LOKI_IMAGE="${LOKI_IMAGE:-docker.io/grafana/loki:3.5.12}"
export MIMIR_IMAGE="${MIMIR_IMAGE:-docker.io/openvidu/grafana-mimir:3.0.6-r0}"
export GRAFANA_IMAGE="${GRAFANA_IMAGE:-docker.io/grafana/grafana:12.3.6}"

get_next_version() {
  case "$1" in
    "3.0.0") echo "3.1.0" ;;
    "3.1.0") echo "3.2.0" ;;
    "3.2.0") echo "3.3.0" ;;
    "3.3.0") echo "3.4.0" ;;
    "3.4.0") echo "3.4.1" ;;
    "3.4.1") echo "3.5.0" ;;
    "3.5.0") echo "3.6.0" ;;
    "3.6.0") echo "3.6.1" ;;
    "3.6.1") echo "3.7.0" ;;
    *) echo "" ;;
  esac
}

# Existing versions use update-new.sh to keep the original update.sh intact.
# Future versions (3.7.x+) will use update.sh normally.
get_update_script() {
  case "$1" in
    "3.1.0"|"3.2.0"|"3.3.0"|"3.4.0"|"3.4.1"|"3.5.0"|"3.6.0"|"3.6.1")
      echo "update-new.sh" ;;
    *)
      echo "update.sh" ;;
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

  if [ "$current" = "$target" ]; then
    echo "Your installed version is $current"
    return 0
  fi

  # Only upgrades from 3.4.0 or 3.4.1 targeting a version > 3.5.0 must stop
  # at 3.5.0 first.
  checkpoint="3.5.0"
  if [ "$current" = "3.4.0" ] || [ "$current" = "3.4.1" ]; then
    if [ "$target" = "main" ] || ( printf '%s\n%s\n' "$checkpoint" "$target" | sort -V -C && [ "$target" != "$checkpoint" ] ); then
      echo "WARNING: Upgrading through OpenVidu ${checkpoint} requires special steps."
      echo "The upgrade process must stop at version ${checkpoint} before continuing."
      echo ""
      echo "Please follow these steps:"
      echo ""
      echo "  1. Upgrade ALL cluster nodes to version ${checkpoint}:"
      echo "     sh <(curl -fsSL ${UPDATE_BASE_URL}/${checkpoint}/update.sh)"
      echo ""
      echo "  2. Start OpenVidu on every node:"
      echo "     systemctl start openvidu"
      echo ""
      echo "  3. Wait for initialization."
      echo ""
      echo "  4. Stop OpenVidu on every node:"
      echo "     systemctl stop openvidu"
      echo ""
      echo "After completing these steps, re-run this upgrade script to continue."
      exit 1
    fi
  fi

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
  fi

  while [ "$next_version" != "$target" ]; do
    if [ -z "$next_version" ]; then
      echo "ERROR: No upgrade path defined for version $current"
      exit 1
    fi
    if [ "$NO_TTY_REQUESTED" != "yes" ]; then
      echo "Upgrading to $next_version before the target version."
      while true; do
        printf "Proceed with upgrading to $next_version? [y/N]: "
        read -r response
        if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
          break
        elif [ "$response" = "n" ] || [ "$response" = "N" ]; then
          echo "Update cancelled"
          exit 1
        else
          echo "Please answer 'y' or 'n'."
        fi
      done
    fi
    echo "Upgrading from $current to $next_version first..."
    TMP_UPDATE="$(mktemp /tmp/ov_update.XXXXXX)"
    update_script="$(get_update_script "$next_version")"
    if ! curl -fsSL "${UPDATE_BASE_URL}/$next_version/${update_script}" -o "$TMP_UPDATE"; then
      rm -f "$TMP_UPDATE"
      echo "ERROR: Failed to download update script for $next_version"
      exit 1
    fi
    if ! env \
      -u OPENVIDU_VERSION \
      -u DOCKER_VERSION \
      -u DOCKER_COMPOSE_VERSION \
      -u UPDATER_IMAGE \
      -u MINIO_SERVER_IMAGE \
      -u MINIO_CLIENT_IMAGE \
      -u MONGO_SERVER_IMAGE \
      -u REDIS_SERVER_IMAGE \
      -u BUSYBOX_IMAGE \
      -u CADDY_SERVER_IMAGE \
      -u CADDY_SERVER_PRO_IMAGE \
      -u OPENVIDU_OPERATOR_IMAGE \
      -u OPENVIDU_SERVER_PRO_IMAGE \
      -u OPENVIDU_SERVER_IMAGE \
      -u OPENVIDU_MEET_SERVER_IMAGE \
      -u OPENVIDU_DASHBOARD_PRO_IMAGE \
      -u OPENVIDU_DASHBOARD_IMAGE \
      -u OPENVIDU_V2COMPATIBILITY_IMAGE \
      -u OPENVIDU_AGENT_SPEECH_PROCESSING_IMAGE \
      -u OPENVIDU_AGENT_PRO_SPEECH_PROCESSING_IMAGE \
      -u LIVEKIT_INGRESS_SERVER_IMAGE \
      -u LIVEKIT_EGRESS_SERVER_IMAGE \
      -u PROMETHEUS_IMAGE \
      -u PROMTAIL_IMAGE \
      -u LOKI_IMAGE \
      -u MIMIR_IMAGE \
      -u GRAFANA_IMAGE \
      sh "$TMP_UPDATE" $NO_TTY_FLAG; then
      rm -f "$TMP_UPDATE"
      echo "ERROR: Intermediate upgrade from $current to $next_version failed"
      exit 1
    fi
    rm -f "$TMP_UPDATE"
    current="$(grep version "${INSTALL_PREFIX}/deployment-info.yaml" | cut -d':' -f2 | sed 's/^ *"//;s/"$//')"
    next_version="$(get_next_version "$current")"
    if [ -z "$next_version" ]; then
      echo "ERROR: No upgrade path found from version $current to $target"
      exit 1
    fi
  done

  return 0
}

# Check if executing as root
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Check --no-tty
if [ -z "${NO_TTY_REQUESTED:+x}" ]; then
  NO_TTY_REQUESTED="no"
  for arg in "$@"; do
    if [ "$arg" = "--no-tty" ]; then
      NO_TTY_REQUESTED="yes"
      break
    fi
  done
  export NO_TTY_REQUESTED
fi

NO_TTY_FLAG=""
if [ "$NO_TTY_REQUESTED" = "yes" ]; then
  NO_TTY_FLAG="--no-tty"
fi

# Ensure docker-compose shim exists
if ! command -v docker-compose > /dev/null 2>&1; then
  if docker compose version > /dev/null 2>&1; then
    cat > /usr/local/bin/docker-compose <<'EOF'
#!/bin/sh
exec docker compose "$@"
EOF
    chmod 755 /usr/local/bin/docker-compose
    mkdir -p /usr/local/lib/docker/cli-plugins
    ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
  fi
fi

# Check Docker installation and version
if [ "${OPENVIDU_SKIP_DOCKER_VERSION_CHECK:-}" != "true" ]; then
  if ! command -v docker > /dev/null 2>&1; then
    echo "ERROR: Docker is not installed. Docker is required to continue."
    exit 1
  else
    CURRENT_DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    VERSION_COMPARISON=$(compare_versions "$CURRENT_DOCKER_VERSION" "$DOCKER_VERSION")

    if [ "$VERSION_COMPARISON" = "lower" ]; then
      echo "WARNING: Docker version $CURRENT_DOCKER_VERSION is older than the recommended version $DOCKER_VERSION."
      printf "Continue anyway? [Y/n]: "
      read -r response
      if [ "$response" != "n" ] && [ "$response" != "N" ]; then
        export OPENVIDU_SKIP_DOCKER_VERSION_CHECK=true
      else
        echo "Update cancelled"
        exit 1
      fi
    fi
  fi
fi

# Check Docker Compose installation and version
if [ "${OPENVIDU_SKIP_DOCKER_COMPOSE_VERSION_CHECK:-}" != "true" ]; then
  DOCKER_COMPOSE_CMD=""
  if command -v docker-compose > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
  elif docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
  fi

  if [ -n "$DOCKER_COMPOSE_CMD" ]; then
    CURRENT_DC_VERSION=$($DOCKER_COMPOSE_CMD --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    # Add 'v' prefix for proper comparison
    CURRENT_DC_VERSION="v${CURRENT_DC_VERSION}"
    VERSION_COMPARISON=$(compare_versions "$CURRENT_DC_VERSION" "$DOCKER_COMPOSE_VERSION")

    if [ "$VERSION_COMPARISON" = "lower" ]; then
      echo "WARNING: Docker Compose version $CURRENT_DC_VERSION is older than the recommended version $DOCKER_COMPOSE_VERSION."
      printf "Continue anyway? [Y/n]: "
      read -r response
      if [ "$response" != "n" ] && [ "$response" != "N" ]; then
        export OPENVIDU_SKIP_DOCKER_COMPOSE_VERSION_CHECK=true
      else
        echo "Update cancelled"
        exit 1
      fi
    fi
  else
    echo "ERROR: Docker Compose is not installed. Docker Compose is required to continue."
    exit 1
  fi
fi

# Validate the upgrade path
CURRENT_VERSION="$(grep version "${INSTALL_PREFIX}/deployment-info.yaml" | cut -d':' -f2 | sed 's/^ *"//;s/"$//')"
validate_upgrade "$CURRENT_VERSION" "$OPENVIDU_VERSION"

# Stop OpenVidu service
echo "Stopping OpenVidu service..."
systemctl stop openvidu

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
