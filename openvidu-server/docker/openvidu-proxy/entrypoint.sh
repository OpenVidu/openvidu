#!/bin/bash

# Checks
if [ -z "${DOMAIN_OR_PUBLIC_IP}" ]; then
  printf "\n  =======¡ERROR!======="
  printf "\n  Variable 'DOMAIN_OR_PUBLIC_IP' it's necessary\n"
  exit 0
fi

if [ -z "${CERTIFICATE_TYPE}" ]; then
  printf "\n  =======¡ERROR!======="
  printf "\n  Variable 'CERTIFICATE_TYPE' it's necessary\n"
  exit 0
fi

if [[ "${CERTIFICATE_TYPE}" == "letsencrypt" && \
      "${LETSENCRYPT_EMAIL}" == "user@example.com" ]]; then
  printf "\n  =======¡ERROR!======="
  printf "\n  If your use LetsEncrypt mode it's necessary a correct email in 'LETSENCRYPT_EMAIL' variable\n"
  exit 0
fi

if [[ "${CERTIFICATE_TYPE}" == "letsencrypt" && \
      -z "${LETSENCRYPT_EMAIL}" ]]; then
  printf "\n  =======¡ERROR!======="
  printf "\n  If your use LetsEncrypt mode it's necessary a correct email in 'LETSENCRYPT_EMAIL' variable\n"
  exit 0
fi

# Global variables
CERTIFICATES_FOLDER=/etc/letsencrypt
CERTIFICATES_LIVE_FOLDER="${CERTIFICATES_FOLDER}/live"
CERTIFICATES_CONF="${CERTIFICATES_LIVE_FOLDER}/certificates.conf"

[ ! -d "${CERTIFICATES_LIVE_FOLDER}" ] && mkdir -p "${CERTIFICATES_LIVE_FOLDER}"
[ ! -f "${CERTIFICATES_CONF}" ] && touch "${CERTIFICATES_CONF}"

# HTTP port proxy configuration
[ -z "${PROXY_HTTP_PORT}" ] && export PROXY_HTTP_PORT=80
[ -z "${PROXY_HTTPS_PORT}" ] && export PROXY_HTTPS_PORT=443
# Proxy is configured based for intermediate security level
# See at https://ssl-config.mozilla.org/#server=nginx&version=1.23.1&config=intermediate&openssl=1.1.1&guideline=5.6
[ -z "${PROXY_HTTPS_PROTOCOLS}" ] && export PROXY_HTTPS_PROTOCOLS='TLSv1.2 TLSv1.3'
[ -z "${PROXY_HTTPS_CIPHERS}" ] && export PROXY_HTTPS_CIPHERS='ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384'
[ -z "${PROXY_HTTPS_HSTS}" ] && export PROXY_HTTPS_HSTS='max-age=63072000'

# Other nginx configuration
[ -z "${WITH_APP}" ] && export WITH_APP=true
[ -z "${SUPPORT_DEPRECATED_API}" ] && export SUPPORT_DEPRECATED_API=false
[ -z "${REDIRECT_WWW}" ] && export REDIRECT_WWW=false
[ -z "${PROXY_MODE}" ] && export PROXY_MODE=CE
[ -z "${WORKER_CONNECTIONS}" ] && export WORKER_CONNECTIONS=10240
[ -z "${CLIENT_MAX_BODY_SIZE}" ] && export CLIENT_MAX_BODY_SIZE=200M
[ -z "${PUBLIC_IP}" ] && export PUBLIC_IP=auto-ipv4
[ -z "${ALLOWED_ACCESS_TO_DASHBOARD}" ] && export ALLOWED_ACCESS_TO_DASHBOARD=all
[ -z "${ALLOWED_ACCESS_TO_RESTAPI}" ] && export ALLOWED_ACCESS_TO_RESTAPI=all
[ -z "${XFRAME_SAMEORIGIN}" ] && export XFRAME_SAMEORIGIN=false

# Show input enviroment variables
printf "\n  ======================================="
printf "\n  =          INPUT VARIABLES            ="
printf "\n  ======================================="
printf "\n"

printf "\n  Config NGINX:"
printf "\n    - Http Port: %s" "${PROXY_HTTP_PORT}"
printf "\n    - Https Port: %s" "${PROXY_HTTPS_PORT}"
printf "\n    - Worker Connections: %s" "${WORKER_CONNECTIONS}"
printf "\n    - Allowed Access in Openvidu Dashboard: %s" "${ALLOWED_ACCESS_TO_DASHBOARD}"
printf "\n    - Allowed Access in Openvidu API: %s" "${ALLOWED_ACCESS_TO_RESTAPI}"
printf "\n    - Support deprecated API: %s" "${SUPPORT_DEPRECATED_API}"
printf "\n    - Redirect www to non-www: %s" "${REDIRECT_WWW}"
printf "\n"
printf "\n  Config Openvidu Application:"
printf "\n    - Domain name: %s" "${DOMAIN_OR_PUBLIC_IP}"
printf "\n    - Certificated: %s" "${CERTIFICATE_TYPE}"
printf "\n    - Letsencrypt Email: %s" "${LETSENCRYPT_EMAIL}"
printf "\n    - Openvidu Application: %s" "${WITH_APP}"
printf "\n    - Openvidu Application Type: %s" "${PROXY_MODE}"

printf "\n"
printf "\n  ======================================="
printf "\n  =       CONFIGURATION NGINX           ="
printf "\n  ======================================="
printf "\n"

# Override worker connections
sed -i "s/{worker_connections}/${WORKER_CONNECTIONS}/g" /etc/nginx/nginx.conf
sed -i "s/{client_max_body_size}/${CLIENT_MAX_BODY_SIZE}/g" /etc/nginx/nginx.conf

printf "\n  Configure %s domain..." "${DOMAIN_OR_PUBLIC_IP}"
OLD_DOMAIN_OR_PUBLIC_IP=$(head -n 1 "${CERTIFICATES_CONF}" | cut -f1 -d$'\t')
CERTIFICATED_OLD_CONFIG=$(head -n 1 "${CERTIFICATES_CONF}" | cut -f2 -d$'\t')

printf "\n    - New configuration: %s %s" "${CERTIFICATE_TYPE}" "${DOMAIN_OR_PUBLIC_IP}"

if [ -z "${CERTIFICATED_OLD_CONFIG}" ]; then
  printf "\n    - Old configuration: none\n"
else
  printf "\n    - Old configuration: %s %s\n" "${CERTIFICATED_OLD_CONFIG}" "${OLD_DOMAIN_OR_PUBLIC_IP}"

  if [ "${CERTIFICATED_OLD_CONFIG}" != "${CERTIFICATE_TYPE}" ] || \
  [ "${OLD_DOMAIN_OR_PUBLIC_IP}" != "${DOMAIN_OR_PUBLIC_IP}" ]; then

    printf "\n    - Restarting configuration... Removing old certificated..."
    # Remove certificate folder safely
    find "${CERTIFICATES_FOLDER:?}" -mindepth 1 -delete
    # Recreate certificates folder
    mkdir -p "${CERTIFICATES_LIVE_FOLDER}"
    touch "${CERTIFICATES_CONF}"
  fi
fi

# Save actual conf
echo -e "${DOMAIN_OR_PUBLIC_IP}\t${CERTIFICATE_TYPE}" > "${CERTIFICATES_CONF}"

# Start with default certbot conf
sed -i "s/{http_port}/${PROXY_HTTP_PORT}/" /etc/nginx/conf.d/default.conf
nginx -g "daemon on;"

case ${CERTIFICATE_TYPE} in

  "selfsigned")
    if [[ ! -f "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && \
          ! -f "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      printf "\n    - Generating selfsigned certificate...\n"

      # Delete and create certificate folder
      rm -rf "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}" | true
      mkdir -p "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}"

      openssl req -new -nodes -x509 \
        -subj "/CN=${DOMAIN_OR_PUBLIC_IP}" -days 365 \
        -keyout "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" \
        -out "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" \
        -extensions v3_ca
    else
      printf "\n    - Selfsigned certificate already exists, using them..."
    fi
    ;;

  "owncert")
    if [[ ! -f "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && \
          ! -f "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      printf "\n    - Copying owncert certificate..."

      # Delete and create certificate folder
      rm -rf "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}" | true
      mkdir -p "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}"

      cp /owncert/certificate.key "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/privkey.pem"
      cp /owncert/certificate.cert "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem"
    else
      printf "\n    - Owncert certificate already exists, using them..."
    fi
    ;;

  "letsencrypt")
    # Init cron
    /usr/sbin/crond -f &
    echo '0 */12 * * * certbot renew --post-hook "nginx -s reload" >> /var/log/cron-letsencrypt.log' | crontab - # Auto renew cert

    if [[ ! -f "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && \
          ! -f "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      printf "\n    - Requesting LetsEncrypt certificate..."

      # Delete certificate folder
      rm -rf "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}" | true

      certbot certonly -n --webroot -w /var/www/certbot \
                                    -m "${LETSENCRYPT_EMAIL}" \
                                    --agree-tos -d "${DOMAIN_OR_PUBLIC_IP}" \
                                    `if [[ "${REDIRECT_WWW}" == "true" ]]; then echo "-d www.${DOMAIN_OR_PUBLIC_IP}" ; fi`
    else
      printf "\n    - LetsEncrypt certificate already exists, using them..."
    fi
    ;;
esac

# All permission certificated folder
chmod -R 777 /etc/letsencrypt

# Use certificates in folder '/default_nginx_conf'
if [ "${PROXY_MODE}" == "CE" ]; then
  # Remove previous configuration
  [[ -f /default_nginx_conf/default.conf ]] && rm /default_nginx_conf/default.conf
  cp /default_nginx_conf/ce/default.conf /default_nginx_conf/default.conf
fi

if [ "${PROXY_MODE}" == "PRO" ]; then
[[ -f /default_nginx_conf/default.conf ]] && rm /default_nginx_conf/default.conf
  cp /default_nginx_conf/pro/default.conf /default_nginx_conf/default.conf
fi

# Create index.html
mkdir -p /var/www/html
cat> /var/www/html/index.html<<EOF
Welcome to OpenVidu Server
EOF

# Load nginx conf files
rm /etc/nginx/conf.d/*

# If custom config, don't generate configuration files
if [[ -f /custom-nginx/custom-nginx.conf ]]; then
  cp /custom-nginx/custom-nginx.conf /etc/nginx/conf.d/custom-nginx.conf
  printf "\n"
  printf "\n  ======================================="
  printf "\n  =         START OPENVIDU PROXY        ="
  printf "\n  =         WITH CUSTOM CONFIG          ="
  printf "\n  ======================================="
  printf "\n\n"
  nginx -s reload

  # nginx logs
  tail -f /var/log/nginx/*.log
  exit 0
fi

# Replace config files
cp /default_nginx_conf/default* /etc/nginx/conf.d

sed -e '/{ssl_config}/{r default_nginx_conf/global/ssl_config.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -e '/{proxy_config}/{r default_nginx_conf/global/proxy_config.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -e '/{nginx_status}/{r default_nginx_conf/global/nginx_status.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -e '/{common_api_ce}/{r default_nginx_conf/global/ce/common_api_ce.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -e '/{new_api_ce}/{r default_nginx_conf/global/ce/new_api_ce.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -e '/{common_api_pro}/{r default_nginx_conf/global/pro/common_api_pro.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -e '/{new_api_pro}/{r default_nginx_conf/global/pro/new_api_pro.conf' -e 'd}' -i /etc/nginx/conf.d/*

if [[ "${WITH_APP}" == "true" ]]; then
  sed -e '/{app_upstream}/{r default_nginx_conf/global/app_upstream.conf' -e 'd}' -i /etc/nginx/conf.d/*
  sed -e '/{app_config}/{r default_nginx_conf/global/app_config.conf' -e 'd}' -i /etc/nginx/conf.d/*
elif [[ "${WITH_APP}" == "false" ]]; then
  sed -i '/{app_upstream}/d' /etc/nginx/conf.d/*
  sed -e '/{app_config}/{r default_nginx_conf/global/app_config_default.conf' -e 'd}' -i /etc/nginx/conf.d/*
fi

if [[ "${XFRAME_SAMEORIGIN}" == "true" ]]; then
  sed -e '/{xframe_options}/{r default_nginx_conf/global/xframe_sameorigin.conf' -e 'd}' -i /etc/nginx/conf.d/*
elif [[ "${XFRAME_SAMEORIGIN}" == "false" ]]; then
  sed -i '/{xframe_options}/d' /etc/nginx/conf.d/*
fi

if [[ "${SUPPORT_DEPRECATED_API}" == "true" ]]; then
  sed -e '/{deprecated_api_ce}/{r default_nginx_conf/global/ce/deprecated_api_ce.conf' -e 'd}' -i /etc/nginx/conf.d/*
  sed -e '/{deprecated_api_pro}/{r default_nginx_conf/global/pro/deprecated_api_pro.conf' -e 'd}' -i /etc/nginx/conf.d/*
elif [[ "${SUPPORT_DEPRECATED_API}" == "false" ]]; then
  sed -i '/{deprecated_api_ce}/d' /etc/nginx/conf.d/*
  sed -i '/{deprecated_api_pro}/d' /etc/nginx/conf.d/*
fi

if [[ "${REDIRECT_WWW}" == "true" ]]; then
  sed -e '/{redirect_www_ssl}/{r default_nginx_conf/global/redirect_www_ssl.conf' -e 'd}' -i /etc/nginx/conf.d/*
  if [[ "${PROXY_MODE}" == "CE" ]]; then
    sed -e '/{redirect_www}/{r default_nginx_conf/global/ce/redirect_www.conf' -e 'd}' -i /etc/nginx/conf.d/*
  fi

  if [ "${PROXY_MODE}" == "PRO" ]; then
    sed -e '/{redirect_www}/{r default_nginx_conf/global/pro/redirect_www.conf' -e 'd}' -i /etc/nginx/conf.d/*
  fi
elif [[ "${REDIRECT_WWW}" == "false" ]]; then
  sed -i '/{redirect_www}/d' /etc/nginx/conf.d/*
  sed -i '/{redirect_www_ssl}/d' /etc/nginx/conf.d/*
fi

# Process main configs
sed -e '/{ssl_config}/{r default_nginx_conf/global/ssl_config.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -e '/{proxy_config}/{r default_nginx_conf/global/proxy_config.conf' -e 'd}' -i /etc/nginx/conf.d/*
sed -i "s/{domain_name}/${DOMAIN_OR_PUBLIC_IP}/g" /etc/nginx/conf.d/*

# Read custom locations and apply them in configuration
if [[ -d /custom-nginx-locations ]]; then
  TMP_PARSED_CUSTOM_LOCATIONS="$(mktemp)"
  {
    for CUSTOM_LOCATION in /custom-nginx-locations/*.conf; do
      [ -f "${CUSTOM_LOCATION}" ] || break
      echo "    # Custom location loaded from: ${CUSTOM_LOCATION}"
      while read -r ; do
        echo "    ${REPLY}"
      done < "${CUSTOM_LOCATION}"
      echo
    done
  } > "${TMP_PARSED_CUSTOM_LOCATIONS}"
  if [[ -n $(cat "${TMP_PARSED_CUSTOM_LOCATIONS}") ]]; then
    sed -e "/{custom_locations}/{r ${TMP_PARSED_CUSTOM_LOCATIONS}" -e 'd}' -i /etc/nginx/conf.d/*
  fi
  rm "${TMP_PARSED_CUSTOM_LOCATIONS}"
fi
# Delete custom_locations if not replaced
sed -i '/{custom_locations}/d' /etc/nginx/conf.d/*

# IPv6 listening (RFC 6540)
if [ ! -f /proc/net/if_inet6 ]; then
  sed -i '/\[::\]:{http_port}/d' /etc/nginx/conf.d/*
  sed -i '/\[::\]:{https_port}/d' /etc/nginx/conf.d/*
fi

sed -i "s/{http_port}/${PROXY_HTTP_PORT}/g" /etc/nginx/conf.d/*
sed -i "s/{https_port}/${PROXY_HTTPS_PORT}/g" /etc/nginx/conf.d/*
sed -i "s/{ssl_protocols}/${PROXY_HTTPS_PROTOCOLS}/g" /etc/nginx/conf.d/*
sed -i "s/{ssl_ciphers}/${PROXY_HTTPS_CIPHERS}/g" /etc/nginx/conf.d/*

if [ -n "${PROXY_HTTPS_HSTS}" ]; then
  sed -i "s/{add_header_hsts}/${PROXY_HTTPS_HSTS}/g" /etc/nginx/conf.d/*
else
  sed -i '/{add_header_hsts}/d' /etc/nginx/conf.d/*
fi

# NGINX access
printf "\n"
printf "\n  ======================================="
printf "\n  =          ALLOWED ACCESS             ="
printf "\n  ======================================="
printf "\n"

printf "\n  Adding rules..."

valid_ip_v4()
{
  regex='^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(/[0-9]+)?$'

  if [[ "$1" =~ $regex ]]; then
    return "$?"
  else
    return "$?"
  fi
}

valid_ip_v6()
{
  regex='^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}(/[0-9]+)?$'

  if [[ "$1" =~ $regex ]]; then
      return "$?"
  else
      return "$?"
  fi
}

LOCAL_NETWORKS=$(ip route list | grep -Eo '([0-9]*\.){3}[0-9]*/[0-9]*')
if [[ "${PUBLIC_IP}" == "auto-ipv4" ]]; then
  PUBLIC_IP=$(/usr/local/bin/discover_my_public_ip.sh)
  printf "\n    - Public IPv4 for rules: %s" "$PUBLIC_IP"
elif [[ "${PUBLIC_IP}" == "auto-ipv6" ]]; then
  PUBLIC_IP=$(/usr/local/bin/discover_my_public_ip.sh --ipv6)
  printf "\n    - Public IPv6 for rules: %s" "$PUBLIC_IP"
else
  if valid_ip_v4 "$PUBLIC_IP"; then
    printf "\n    - Valid defined public IPv4: %s" "$PUBLIC_IP"
  elif valid_ip_v6 "$PUBLIC_IP"; then
    printf "\n    - Valid defined public IPv6: %s" "$PUBLIC_IP"
  else
    printf "\n    - Not valid defined IP Address: %s" "$PUBLIC_IP"
  fi
fi

if [ "${ALLOWED_ACCESS_TO_DASHBOARD}" != "all" ]; then
    IFS=','
    for IP in $(echo "${ALLOWED_ACCESS_TO_DASHBOARD}" | tr -d '[:space:]')
    do
        if valid_ip_v4 "$IP" || valid_ip_v6 "$IP"; then
            if [ -z "${RULES_DASHBOARD}" ]; then
                RULES_DASHBOARD="allow $IP;"

                printf "\n    - Allowing IP/RANGE %s in Dashboard..." "$IP"
            else
                if ! echo "${RULES_DASHBOARD}" | grep -q "$IP"; then
                  RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow $IP;"

                  printf "\n    - Allowing IP/RANGE %s in Dashboard..." "$IP"
                fi
            fi

            if [ -z "${RULES_RESTAPI}" ]; then
                RULES_RESTAPI="allow $IP;"

                printf "\n    - Allowing IP/RANGE %s in Rest-API..." "$IP"
            else
                if ! echo "${RULES_RESTAPI}" | grep -q "$IP"; then
                  RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $IP;"

                  printf "\n    - Allowing IP/RANGE %s in Rest-API..." "$IP"
                fi
            fi
        else
            printf "\n  =======¡ERROR!======="
            printf "\n    - IP or RANGE %s is not valid\n" "$IP"
            exit 0
        fi
    done
else
    RULES_DASHBOARD="allow all;"
fi

if [ "${ALLOWED_ACCESS_TO_RESTAPI}" != "all" ]; then
    IFS=','
    for IP in $(echo "${ALLOWED_ACCESS_TO_RESTAPI}" | tr -d '[:space:]')
    do
        if valid_ip_v4 "$IP" || valid_ip_v6 "$IP"; then
            if [ -z "${RULES_RESTAPI}" ]; then
                RULES_RESTAPI="allow $IP;"

                printf "\n    - Allowing IP/RANGE %s in Rest-API..." "$IP"
            else
                if ! echo "${RULES_RESTAPI}" | grep -q "$IP"; then
                  RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $IP;"

                  printf "\n    - Allowing IP/RANGE %s in Rest-API..." "$IP"
                fi
            fi
        else
            printf "\n  =======¡ERROR!======="
            printf "\n    - IP or RANGE %s is not valid\n" "$IP"
            exit 0
        fi
    done
else
    RULES_RESTAPI="allow all;"
fi

if [ "${RULES_DASHBOARD}" != "allow all;" ]; then
  if ! echo "${RULES_DASHBOARD}" | grep -q "$PUBLIC_IP" && valid_ip_v4 "$PUBLIC_IP" || valid_ip_v6 "$PUBLIC_IP"; then
    RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow $PUBLIC_IP;"
  fi

  if ! echo "${RULES_DASHBOARD}" | grep -q "127.0.0.1"; then
    RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow 127.0.0.1;"
  fi

  IFS=$'\n'
  for IP in ${LOCAL_NETWORKS}
  do
    if ! echo "${RULES_DASHBOARD}" | grep -q "$IP" && valid_ip_v4 "$IP" || valid_ip_v6 "$IP"; then
      RULES_DASHBOARD="${RULES_DASHBOARD}{new_line}allow $IP;"
    fi
  done
fi

if [ "${RULES_RESTAPI}" != "allow all;" ]; then
  if ! echo "${RULES_RESTAPI}" | grep -q "$PUBLIC_IP" && valid_ip_v4 "$PUBLIC_IP" || valid_ip_v6 "$PUBLIC_IP"; then
    RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $PUBLIC_IP;"
  fi

  if ! echo "${RULES_RESTAPI}" | grep -q "127.0.0.1"; then
    RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow 127.0.0.1;"
  fi

  IFS=$'\n'
  for IP in ${LOCAL_NETWORKS}
  do
    if ! echo "${RULES_RESTAPI}" | grep -q "$IP" && valid_ip_v4 "$IP" || valid_ip_v6 "$IP"; then
      RULES_RESTAPI="${RULES_RESTAPI}{new_line}allow $IP;"
    fi
  done
fi

sed -i "s/{rules_access_dashboard}/$(echo "${RULES_DASHBOARD}" | sed 's#/#\\/#g')/g" /etc/nginx/conf.d/*
sed -i "s/{rules_acess_api}/$(echo "${RULES_RESTAPI}" | sed 's#/#\\/#g')/g" /etc/nginx/conf.d/*
sed -i "s/{new_line}/\n\t/g" /etc/nginx/conf.d/* # New line

printf "\n"
printf "\n  Finish Rules:"
printf "\n    Openvidu Dashboard: \n\t\t- %s" "$(echo "${RULES_DASHBOARD}" | sed 's/{new_line}/\n\t\t- /g')"
printf "\n    Openvidu API: \n\t\t- %s" "$(echo "${RULES_RESTAPI}" | sed 's/{new_line}/\n\t\t- /g')"

# Restart nginx service
printf "\n"
printf "\n  ======================================="
printf "\n  =         START OPENVIDU PROXY        ="
printf "\n  ======================================="
printf "\n\n"
echo "Restarting nginx"
NGINX_STARTING_PID=$(cat /var/run/nginx.pid)
while kill -s 0 "$NGINX_STARTING_PID" 2> /dev/null; do
  nginx -s quit
  sleep 10
done
echo "Starting nginx..."
nginx -g "daemon off;"
