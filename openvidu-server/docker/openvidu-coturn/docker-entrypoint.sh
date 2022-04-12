#!/bin/sh

# Get automatically generated secret by OpenVidu Server if COTURN_SHARED_SECRET_KEY is not defined
if [ -z "${COTURN_SHARED_SECRET_KEY}" ]; then
    # Check if random sahred key is generated and with value
    if [ ! -f /run/secrets/coturn/shared-secret-key ]; then
        echo "Error: shared-secret-key not found."
        exit 1
    fi

    # Read value
    export "$(grep -v '#' /run/secrets/coturn/shared-secret-key  | grep COTURN_SHARED_SECRET_KEY |
        sed 's/\r$//' | awk '/=/ {print $1}')"

fi

echo "Defined COTURN_SHARED_SECRET_KEY: ${COTURN_SHARED_SECRET_KEY}"

# If command starts with an option, prepend with turnserver binary.
if [ "${1:0:1}" == '-' ]; then
  set -- turnserver "$@"
fi

exec $(eval "echo $@")