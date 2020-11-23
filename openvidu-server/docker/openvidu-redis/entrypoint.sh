#!/bin/sh

if [ -f /proc/net/if_inet6 ]; then
  [ -z "${REDIS_BINDING}" ] && REDIS_BINDING="127.0.0.1 ::1"
else
  [ -z "${REDIS_BINDING}" ] && REDIS_BINDING="127.0.0.1"
fi

printf "\n"
printf "\n  ======================================="
printf "\n  =            REDIS CONF               ="
printf "\n  ======================================="
printf "\n"

printf "\n  REDIS_BINDING: %s" "${REDIS_BINDING}"
printf "\n  REDIS_PASSWORD: %s" "${REDIS_PASSWORD}"

mkdir -p /usr/local/etc/redis
cat>/usr/local/etc/redis/redis.conf<<EOF
bind ${REDIS_BINDING}
requirepass ${REDIS_PASSWORD}
EOF

printf "\n"
printf "\n  ======================================="
printf "\n  =            START REDIS              ="
printf "\n  ======================================="
printf "\n"

redis-server /usr/local/etc/redis/redis.conf
