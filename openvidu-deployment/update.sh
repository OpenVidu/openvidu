#!/bin/sh
set -eu
export INSTALL_PREFIX="${INSTALL_PREFIX:-/opt/openvidu}"
export OPENVIDU_VERSION="${OPENVIDU_VERSION:-main}"
export REGISTRY="${REGISTRY:-docker.io}"
export UPDATER_IMAGE="${UPDATER_IMAGE:-${REGISTRY}/openvidu/openvidu-updater:${OPENVIDU_VERSION}}"

# Check if executing as root
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Check if docker is installed
if ! command -v docker > /dev/null 2>&1; then
    echo "Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check if file /opt/openvidu/deployment-info.yaml exists
if ! [ -f /opt/openvidu/deployment-info.yaml ]; then
    echo "OpenVidu is not installed. Please install OpenVidu and try again."
    exit 1
fi

# Stop OpenVidu service
echo "Stopping OpenVidu service..."
systemctl stop openvidu

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

if [ -f "${TMP_DIR}/post-update.sh" ]; then
  chmod +x "${TMP_DIR}/post-update.sh"
  "${TMP_DIR}/post-update.sh"
fi
