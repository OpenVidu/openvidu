#!/bin/bash

printf "\n"
printf "\n  ======================================="
printf "\n  =       LAUNCH OPENVIDU-SERVER        ="
printf "\n  ======================================="
printf "\n"

# Generate Coturn shared secret key, if COTURN_SHARED_SECRET_KEY is not defined
if [[ -z "${COTURN_SHARED_SECRET_KEY}" ]]; then
    # Check if random sahred key is generated and with value
    if [[ ! -f /run/secrets/coturn/shared-secret-key ]]; then
        RANDOM_COTURN_SECRET="$(tr -dc A-Za-z0-9 </dev/urandom | head -c 35 ; echo '')"
        sed "s|{{COTURN_SHARED_SECRET_KEY}}|${RANDOM_COTURN_SECRET}|g" \
            /usr/local/coturn-shared-key.template > /run/secrets/coturn/shared-secret-key
    fi

    # Read value
    export "$(grep -v '#' /run/secrets/coturn/shared-secret-key  | grep COTURN_SHARED_SECRET_KEY |
        sed 's/\r$//' | awk '/=/ {print $1}')"
fi

# Get coturn public ip
[[ -z "${COTURN_IP}" ]] && export COTURN_IP=auto-ipv4
if [[ "${COTURN_IP}" == "auto-ipv4" ]]; then
    COTURN_IP=$(/usr/local/bin/discover_my_public_ip.sh)
elif [[ "${COTURN_IP}" == "auto-ipv6" ]]; then
    COTURN_IP=$(/usr/local/bin/discover_my_public_ip.sh --ipv6)
fi

if [[ "${OV_CE_DEBUG_LEVEL}" == "DEBUG" ]]; then
    export LOGGING_LEVEL_IO_OPENVIDU_SERVER=DEBUG
fi

if [ ! -z "${JAVA_OPTIONS}" ]; then
    printf "\n  Using java options: %s" "${JAVA_OPTIONS}"
fi

java ${JAVA_OPTIONS:-} -jar openvidu-server.jar
