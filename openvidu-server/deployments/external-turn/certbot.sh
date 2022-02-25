#!/bin/sh -x

# Trap exit signal
exit_func() {
    exit 1
}
trap exit_func TERM INT

export CRONTIME="${CRONTIME:-12h}"
export COTURN_CONTAINER_NAME="${COTURN_CONTAINER_NAME:-coturn}"

while :; do
    CERTIFICATES_FOUND=false
    if [ -f "/etc/letsencrypt/live/${TURN_DOMAIN_NAME}/cert.pem" ] &&
       [ -f "/etc/letsencrypt/live/${TURN_DOMAIN_NAME}/privkey.pem" ]; then
    	CERTIFICATES_FOUND=true
    fi
    certbot "$@";
    # Let coturn to load letsencrypt certificates
    chmod 777 -R /etc/letsencrypt;
    TURN_PID=$(pgrep -n '^turnserver$')
    if [ -n "${TURN_PID}" ]; then
        if [ "${CERTIFICATES_FOUND}" = "false" ]; then
            # If certificates not found on startup, restart coturn
            kill -KILL "${TURN_PID}"
        else
            # Send SIGUSR2 signal to coturn to restart process with new certificates
            # As certbot is running in the same namespace as coturn,
            # it will send the signal to the coturn process to reload the certificates
            kill -USR2 "${TURN_PID}"
        fi
    fi
    # Sleep CRONTIME seconds for next check
    sleep "${CRONTIME}" &
    # Wait for sleep without blocking signals
    wait $!
done;