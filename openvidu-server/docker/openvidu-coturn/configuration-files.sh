#!/bin/bash

# Enable turn
cat>/etc/default/coturn<<EOF
TURNSERVER_ENABLED=1
EOF

# Turn server configuration
cat>/etc/turnserver.conf<<EOF
listening-port=${TURN_LISTEN_PORT}
fingerprint
lt-cred-mech
max-port=${MAX_PORT:-65535}
min-port=${MIN_PORT:-40000}
simple-log
pidfile="/var/run/turnserver.pid"
realm=openvidu
verbose
EOF

if [[ ! -z "${TURN_PUBLIC_IP}" ]]; then
    echo "external-ip=${TURN_PUBLIC_IP}" >> /etc/turnserver.conf
fi

if [[ ! -z "${REDIS_IP}" ]] && [[ ! -z "${DB_NAME}" ]] && [[ ! -z "${DB_PASSWORD}" ]]; then
    echo "redis-userdb=\"ip=${REDIS_IP} dbname=${DB_NAME} password=${DB_PASSWORD} connect_timeout=30\"" >> /etc/turnserver.conf
fi

if [[ ! -z "${TURN_USERNAME_PASSWORD}" ]]; then
    echo "user=${TURN_USERNAME_PASSWORD}" >> /etc/turnserver.conf
fi