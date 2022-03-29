#!/bin/bash
set -eu -o pipefail

print_usage() {
    printf "Returns AMI id from eu-west-1. Useful for upgrades using AWS"
    printf "Usage: get_ov_media_node_ami_id <version>"
    printf "\n"
}

# Remove "v" of version if exist
OPENVIDU_VERSION="${1:-}"
OPENVIDU_VERSION="${OPENVIDU_VERSION//v}"

#################################
#       Constants               #
#################################
BASE_CF_URL="https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/CF-OpenVidu-Pro-${OPENVIDU_VERSION}.yaml"

#################################
#     Get Media Node AMI ID     #
#################################
if [[ -z "${OPENVIDU_VERSION}" ]]; then
    echo "Version must be defined as first argument"
    exit 1
fi

CONTENT="$(curl --fail --silent "${BASE_CF_URL}" || echo "ERROR")"
if [[ "${CONTENT}" == "ERROR" ]]; then
    echo "Error while fetching: ${BASE_CF_URL}"
    exit 1
fi


AMI_ID=$(echo "${CONTENT}" | sed -n -e '/KMSAMIMAP:/,/Metadata:/ p' | grep -A 1 eu-west-1 | grep AMI | tr -d " " | cut -d":" -f2 || echo "Not found")
if [[ "${AMI_ID}" == "Not found" ]]; then
    echo "Not found"
    exit 1
fi
echo "${AMI_ID}"
