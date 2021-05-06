#!/bin/sh
if [ ! -z "${REDIS_IP}" ] && [ ! -z "${DB_NAME}" ] && [ ! -z "${DB_PASSWORD}" ]; then
    echo "redis-userdb=\"ip=${REDIS_IP} dbname=${DB_NAME} password=${DB_PASSWORD} connect_timeout=30\"" >> turnserver.conf
fi

# If command starts with an option, prepend with turnserver binary.
if [ "${1:0:1}" == '-' ]; then
  set -- turnserver "$@"
fi

exec $(eval "echo $@")