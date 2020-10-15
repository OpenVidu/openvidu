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
[ -z "${PROXY_HTTP_PORT}" ] && export PROXY_HTTP_PORT=80
[ -z "${PROXY_HTTPS_PORT}" ] && export PROXY_HTTPS_PORT=443
[ -z "${WITH_APP}" ] && export WITH_APP=true
[ -z "${SUPPORT_DEPRECATED_API}" ] && export SUPPORT_DEPRECATED_API=true
[ -z "${PROXY_MODE}" ] && export PROXY_MODE=CE
[ -z "${ALLOWED_ACCESS_TO_DASHBOARD}" ] && export ALLOWED_ACCESS_TO_DASHBOARD=all
[ -z "${ALLOWED_ACCESS_TO_RESTAPI}" ] && export ALLOWED_ACCESS_TO_RESTAPI=all

# Show input enviroment variables
printf "\n  ======================================="
printf "\n  =          INPUT VARIABLES            ="
printf "\n  ======================================="
printf "\n"

printf "\n  Config NGINX:"
printf "\n    - Http Port: %s" "${PROXY_HTTP_PORT}"
printf "\n    - Https Port: %s" "${PROXY_HTTPS_PORT}"
printf "\n    - Allowed Access in Openvidu Dashboard: %s" "${ALLOWED_ACCESS_TO_DASHBOARD}"
printf "\n    - Allowed Access in Openvidu API: %s" "${ALLOWED_ACCESS_TO_RESTAPI}"
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

printf "\n  Configure %s domain..." "${DOMAIN_OR_PUBLIC_IP}"
OLD_DOMAIN_OR_PUBLIC_IP=$(head -n 1 "${CERTIFICATES_CONF}" | cut -f1 -d$'\t')
CERTIFICATED_OLD_CONFIG=$(head -n 1 "${CERTIFICATES_CONF}" | cut -f2 -d$'\t')

printf "\n    - New configuration: %s %s" "${CERTIFICATE_TYPE}" "${DOMAIN_OR_PUBLIC_IP}"

if [ -z "${CERTIFICATED_OLD_CONFIG}" ]; then
  printf "\n    - Old configuration: none"
else
  printf "\n    - Old configuration: %s %s" "${CERTIFICATED_OLD_CONFIG}" "${OLD_DOMAIN_OR_PUBLIC_IP}"

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
      printf "\n    - Copying owmcert certificate..."

      # Delete and create certificate folder
      rm -rf "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}" | true
      mkdir -p "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}" 

      cp /owncert/certificate.key "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/privkey.pem"
      cp /owncert/certificate.cert "${CERTIFICATES_LIVE_FOLDER:?}/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem"
    else
      printf "\n    - Owmcert certificate already exists, using them..."
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
                                    --agree-tos -d "${DOMAIN_OR_PUBLIC_IP}"
    else
      printf "\n    - LetsEncrypt certificate already exists, using them..."
    fi
    ;;
esac

# All permission certificated folder
chmod -R 777 /etc/letsencrypt

# Use certificates in folder '/default_nginx_conf'
if [ "${PROXY_MODE}" == "CE" ]; then
  if [ "${WITH_APP}" == "true" ] && [ "${SUPPORT_DEPRECATED_API}" == "true" ]; then
    mv /default_nginx_conf/ce/support_deprecated_api/default-app.conf /default_nginx_conf/default-app.conf
  elif [ "${WITH_APP}" == "true" ] && [ "${SUPPORT_DEPRECATED_API}" == "false" ]; then
    mv /default_nginx_conf/ce/default-app.conf /default_nginx_conf/default-app.conf
  elif [ "${WITH_APP}" == "false" ] && [ "${SUPPORT_DEPRECATED_API}" == "true" ]; then
    mv /default_nginx_conf/ce/support_deprecated_api/default-app-without-demos.conf /default_nginx_conf/default-app.conf
  elif [ "${WITH_APP}" == "false" ] && [ "${SUPPORT_DEPRECATED_API}" == "false" ]; then
    mv /default_nginx_conf/ce/default-app-without-demos.conf /default_nginx_conf/default-app.conf
  fi
  mv /default_nginx_conf/ce/default.conf /default_nginx_conf/default.conf

  rm -rf /default_nginx_conf/ce
  rm -rf /default_nginx_conf/pro
fi

if [ "${PROXY_MODE}" == "PRO" ]; then
  if [ "${WITH_APP}" == "true" ] && [ "${SUPPORT_DEPRECATED_API}" == "true" ]; then
    mv /default_nginx_conf/pro/support_deprecated_api/default.conf /default_nginx_conf/default.conf
  elif [ "${WITH_APP}" == "true" ] && [ "${SUPPORT_DEPRECATED_API}" == "false" ]; then
    mv /default_nginx_conf/pro/default.conf /default_nginx_conf/default.conf
  elif [ "${WITH_APP}" == "false" ] && [ "${SUPPORT_DEPRECATED_API}" == "true" ]; then
    mv /default_nginx_conf/pro/support_deprecated_api/default-app-without-demos.conf /default_nginx_conf/default.conf
  elif [ "${WITH_APP}" == "false" ] && [ "${SUPPORT_DEPRECATED_API}" == "false" ]; then
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
printf "\n"
printf "\n  ======================================="
printf "\n  =          ALLOWED ACCESS             ="
printf "\n  ======================================="
printf "\n"

printf "\n  Adding rules..."
LOCAL_NETWORKS=$(ip route list | grep -Eo '([0-9]*\.){3}[0-9]*/[0-9]*')
PUBLIC_IP=$(/usr/local/bin/discover_my_public_ip.sh)

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
  if ! echo "${RULES_DASHBOARD}" | grep -q "$PUBLIC_IP" && valid_ip_v4 "$PUBLIC_IP" || valid_ip_v6 "$IP"; then
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
  if ! echo "${RULES_RESTAPI}" | grep -q "$PUBLIC_IP" && valid_ip_v4 "$PUBLIC_IP" || valid_ip_v6 "$IP"; then
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
nginx -s reload

# nginx logs
tail -f /var/log/nginx/*.log
