#!/bin/sh

[ -z "${PROXY_HTTP_PORT}" ] && export PROXY_HTTP_PORT=80
[ -z "${PROXY_HTTPS_PORT}" ] && export PROXY_HTTPS_PORT=443
[ -z "${ALLOWED_ACCESS_TO_DASHBOARD}" ] && export ALLOWED_ACCESS_TO_DASHBOARD=all
[ -z "${ALLOWED_ACCESS_TO_RESTAPI}" ] && export ALLOWED_ACCESS_TO_RESTAPI=all

# Start with default certbot conf
nginx -g "daemon on;"

# Show input enviroment variables
echo "Http Port: ${PROXY_HTTP_PORT}"
echo "Https Port: ${PROXY_HTTPS_PORT}"
echo "Allowed Dashboard: ${ALLOWED_ACCESS_TO_DASHBOARD}"
echo "Allowed API: ${ALLOWED_ACCESS_TO_RESTAPI}"
echo "Domain name: ${DOMAIN_OR_PUBLIC_IP}"
echo "Certificated: ${CERTIFICATE_TYPE}"
echo "Letsencrypt Email: ${LETSENCRYPT_EMAIL}"
echo "Proxy mode: ${PROXY_MODE:-CE}"
echo "Demos mode: ${WITH_DEMOS:-true}"

case ${CERTIFICATE_TYPE} in

  "selfsigned")
    echo "===Mode selfsigned==="

    if [[ ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      echo "Generating certificated..."
      
      rm -rf /etc/letsencrypt/live/*
      mkdir -p "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}"

      openssl req -new -nodes -x509 \
        -subj "/CN=${DOMAIN_OR_PUBLIC_IP}" -days 365 \
        -keyout "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" \
        -out "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" -extensions v3_ca
    else
      echo "The certificate already exists, using them..."
    fi
    ;;

  "owncert")
    echo "===Mode owncert==="

    if [[ ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      echo "Using owmcert..."

      rm -rf /etc/letsencrypt/live/*
      mkdir -p "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}"
      cp /owncert/certificate.key "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem"
      cp /owncert/certificate.cert "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem"

    else
      echo "The certificate already exists, using them..."
    fi
    ;;

  "letsencrypt")
    echo "===Mode letsencrypt==="

    # Auto renew cert
    echo "0 12 * * * certbot renew >> /var/log/nginx/cron-letsencrypt.log" | crontab -

    if [[ ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      echo "Requesting certificate..."

    certbot certonly -n --webroot -w /var/www/certbot -m "${LETSENCRYPT_EMAIL}" --agree-tos -d "${DOMAIN_OR_PUBLIC_IP}"
    else
      echo "The certificate already exists, using them..."
    fi
    ;;
esac

# All permission certificated folder
chmod -R 777 /etc/letsencrypt

# Use certificates in folder '/default_nginx_conf'
if [ "${PROXY_MODE}" == "CE" ]; then
  if [ "${WITH_DEMOS}" == "true" ]; then
    mv /default_nginx_conf/ce/default-app.conf /default_nginx_conf/default-app.conf
    mv /default_nginx_conf/ce/default.conf /default_nginx_conf/default.conf
  else
    mv /default_nginx_conf/ce/default-app-without-demos.conf /default_nginx_conf/default-app.conf
    mv /default_nginx_conf/ce/default.conf /default_nginx_conf/default.conf
  fi

  rm -rf /default_nginx_conf/ce
  rm -rf /default_nginx_conf/pro
fi

if [ "${PROXY_MODE}" == "PRO" ]; then
  if [ "${WITH_DEMOS}" == "true" ]; then
    mv /default_nginx_conf/pro/default.conf /default_nginx_conf/default.conf
  else
    mv /default_nginx_conf/pro/default-app-without-demos.conf /default_nginx_conf/default.conf
  fi

  rm -rf /default_nginx_conf/ce
  rm -rf /default_nginx_conf/pro
fi

# Create index.html
mkdir -p /var/www/html
cat> /var/www/html/index.html<<EOF
Welcome to OpenVidu Server
EOF

# Load nginx conf files
rm /etc/nginx/conf.d/*
cp /default_nginx_conf/* /etc/nginx/conf.d
sed -i "s/{domain_name}/${DOMAIN_OR_PUBLIC_IP}/g" /etc/nginx/conf.d/*
sed -i "s/{http_port}/${PROXY_HTTP_PORT}/g" /etc/nginx/conf.d/*
sed -i "s/{https_port}/${PROXY_HTTPS_PORT}/g" /etc/nginx/conf.d/*

# NGINX access
LOCAL_NETWORKS=$(ip route list | grep -Eo '([0-9]*\.){3}[0-9]*/[0-9]*')
PUBLIC_IP=$(/usr/local/bin/discover_my_public_ip.sh)

valid_ip_v4()
{
    if ipcalc "$1" \
        | awk 'BEGIN{FS=":"; is_invalid=0} /^INVALID/ {is_invalid=1} END {exit is_invalid}'
    then
        return "$?"
    else 
        return "$?"
    fi
}

if [ "${ALLOWED_ACCESS_TO_DASHBOARD}" != "all" ]; then
    IFS=','
    for IP in $(echo "${ALLOWED_ACCESS_TO_DASHBOARD}" | tr -d '[:space:]')
    do
        if valid_ip_v4 "$IP"; then
            if [ -z "${RULES_DASHBOARD}" ]; then
                RULES_DASHBOARD="allow $IP;"
            else
                if ! echo "${RULES_DASHBOARD}" | grep -q "$IP"; then
                  RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow $IP;"
                fi
            fi

            if [ -z "${RULES_RESTAPI}" ]; then
                RULES_RESTAPI="allow $IP;"
            else
                if ! echo "${RULES_RESTAPI}" | grep -q "$IP"; then
                  RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $IP;"
                fi
            fi
        else
            echo "Ip or range $IP is not valid"
        fi
    done
else 
    RULES_DASHBOARD="allow all;"
fi

if [ "${ALLOWED_ACCESS_TO_RESTAPI}" != "all" ]; then
    IFS=','
    for IP in $(echo "${ALLOWED_ACCESS_TO_RESTAPI}" | tr -d '[:space:]')
    do
        if valid_ip_v4 "$IP"; then
            if [ -z "${RULES_RESTAPI}" ]; then
                RULES_RESTAPI="allow $IP;"
            else
                if ! echo "${RULES_RESTAPI}" | grep -q "$IP"; then
                  RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $IP;"
                fi
            fi
        else
            echo "Ip or range $IP is not valid"
        fi
    done
else
    RULES_RESTAPI="allow all;"
fi

if [ "${RULES_DASHBOARD}" != "allow all;" ]; then
  if ! echo "${RULES_DASHBOARD}" | grep -q "$PUBLIC_IP" && valid_ip_v4 "$PUBLIC_IP"; then
    RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow $PUBLIC_IP;"
  fi

  if ! echo "${RULES_DASHBOARD}" | grep -q "127.0.0.1"; then
    RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow 127.0.0.1;"
  fi

  IFS=$'\n'
  for IP in ${LOCAL_NETWORKS}
  do
    if ! echo "${RULES_DASHBOARD}" | grep -q "$IP" && valid_ip_v4 "$IP"; then
      RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow $IP;"
    fi
  done
fi

if [ "${RULES_RESTAPI}" != "allow all;" ]; then
  if ! echo "${RULES_RESTAPI}" | grep -q "$PUBLIC_IP" && valid_ip_v4 "$PUBLIC_IP"; then
    RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $PUBLIC_IP;"
  fi

  if ! echo "${RULES_DASHBOARD}" | grep -q "127.0.0.1"; then
    RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow 127.0.0.1;"
  fi
  
  IFS=$'\n'
  for IP in ${LOCAL_NETWORKS}
  do
    if ! echo "${RULES_RESTAPI}" | grep -q "$IP" && valid_ip_v4 "$IP"; then
      RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $IP;"
    fi
  done
fi

sed -i "s/{rules_access_dashboard}/$(echo "${RULES_DASHBOARD}" | sed 's#/#\\/#g')/g" /etc/nginx/conf.d/*
sed -i "s/{rules_acess_api}/$(echo "${RULES_RESTAPI}" | sed 's#/#\\/#g')/g" /etc/nginx/conf.d/*
sed -i "s/{new_line}/\n\t/g" /etc/nginx/conf.d/* # New line

printf "Rules DASHBOARD: \n \t%s\n" "$(echo "${RULES_DASHBOARD}" | sed 's/{new_line}/\n\t/g')"
printf "Rules RESTAPI: \n \t%s\n" "$(echo "${RULES_RESTAPI}" | sed 's/{new_line}/\n\t/g')"

# Restart nginx service
nginx -s reload

# Init cron
/usr/sbin/crond -f &

# nginx logs
tail -f /var/log/nginx/*.log
