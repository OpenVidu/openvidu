#!/bin/bash

# Set debug mode
DEBUG=${DEBUG:-false}
[ "$DEBUG" == "true" ] && set -x

#Check parameters
[[ ! -z "${TURN_PUBLIC_IP}" ]] || export TURN_PUBLIC_IP=$(/usr/local/bin/discover_my_public_ip.sh)

echo "TURN public IP: ${TURN_PUBLIC_IP}"

[[ ! -z "${TURN_LISTEN_PORT}" ]] && echo "TURN listening port: ${TURN_LISTEN_PORT}" ||
    { echo "TURN_LISTEN_PORT environment variable is not defined"; exit 1; }

[[ ! -z "${MIN_PORT}" ]] && echo "Defined min port coturn: ${MIN_PORT}" || echo "Min port coturn: 40000"

[[ ! -z "${MAX_PORT}" ]] && echo "Defined max port coturn: ${MAX_PORT}" || echo "Max port coturn: 65535"

# Load configuration files of coturn
source /tmp/configuration-files.sh

# Remove temp file with configuration parameters
rm /tmp/configuration-files.sh

/usr/bin/turnserver -c /etc/turnserver.conf -v --log-file /dev/null