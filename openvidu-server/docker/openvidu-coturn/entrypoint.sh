#!/bin/bash

# Set debug mode
DEBUG=${DEBUG:-false}
[ "$DEBUG" == "true" ] && set -x

#Check parameters
[[ ! -z "${TURN_PUBLIC_IP}" ]] || export TURN_PUBLIC_IP=$(/usr/local/bin/discover_my_public_ip.sh)

echo "TURN public IP: ${TURN_PUBLIC_IP}"

[[ ! -z "${TURN_LISTEN_PORT}" ]] && echo "TURN listening port: ${TURN_LISTEN_PORT}" ||
    { echo "TURN_LISTEN_PORT environment variable is not defined"; exit 1; }

[[ ! -z "${REDIS_IP}" ]] && echo "REDIS IP: ${REDIS_IP}" || { echo "REDIS_IP environment variable is not defined"; exit 1; }

[[ ! -z "${DB_NAME}" ]] || { echo "DB_NAME environment variable is not defined"; exit 1; }

[[ ! -z "${DB_PASSWORD}" ]] || { echo "DB_PASSWORD environment variable is not defined"; exit 1; }

[[ ! -z "${MIN_PORT}" ]] && echo "Defined min port coturn: ${MIN_PORT}" || echo "Min port coturn: 40000"

[[ ! -z "${MAX_PORT}" ]] && echo "Defined max port coturn: ${MAX_PORT}" || echo "Max port coturn: 65535"

# Load configuration files of coturn
source /tmp/configuration-files.sh

# Remove temp file with configuration parameters
rm /tmp/configuration-files.sh

# Save coturn External IP for other services


# Execute turn daemon
/usr/bin/turnserver -c /etc/turnserver.conf -v &


MAX_SECONDS=30
# K8s only show turn server log in this way
while [ -z $(ls /var/log/ | grep turn_) ] && [ $SECONDS -lt $MAX_SECONDS ]
do
  echo "Waiting turnserver to be running"
  sleep 2
done

tail -f /var/log/turn_*.log
