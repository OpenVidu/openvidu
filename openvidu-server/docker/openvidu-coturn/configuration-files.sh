#!/bin/bash

# Enable turn
cat>/etc/default/coturn<<EOF
TURNSERVER_ENABLED=1
EOF

# Turn server configuration
cat>/etc/turnserver.conf<<EOF
external-ip=${TURN_PUBLIC_IP}
listening-port=${TURN_LISTEN_PORT}
fingerprint
lt-cred-mech
max-port=${MAX_PORT:-65535}
min-port=${MIN_PORT:-40000}
pidfile="/var/run/turnserver.pid"
realm=openvidu
simple-log
redis-userdb="ip=${REDIS_IP} dbname=${DB_NAME} password=${DB_PASSWORD} connect_timeout=30"
verbose
EOF