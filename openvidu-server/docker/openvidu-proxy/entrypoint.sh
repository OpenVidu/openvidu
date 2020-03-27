#!/bin/bash

# Start with default certbot conf
service nginx start

# Show input enviroment variables
echo "Domain name: ${DOMAIN_OR_PUBLIC_IP}"
echo "Certificated: ${CERTIFICATE_TYPE}"
echo "Letsencrypt Email: ${LETSENCRYPT_EMAIL}"

if [ -z "${NGINX_CONF}" ]; then
  NGINX_CONF=default
fi

echo "NGINX Conf: ${NGINX_CONF}"

case ${CERTIFICATE_TYPE} in

  "selfsigned")
    echo "===Mode selfsigned==="
    DOMAIN_OR_PUBLIC_IP="openvidu"

    if [[ ! -f "/etc/letsencrypt/live/openvidu/privkey.pem" && ! -f "/etc/letsencrypt/live/openvidu/fullchain.pem" ]]; then
      echo "Generating certificated..."
      
      rm -rf /etc/letsencrypt/live/*
      mkdir -p /etc/letsencrypt/live/openvidu

      openssl req -new -nodes -x509 \
        -subj "/CN=openvidu" -days 365 \
        -keyout /etc/letsencrypt/live/openvidu/privkey.pem -out /etc/letsencrypt/live/openvidu/fullchain.pem -extensions v3_ca
    else
      echo "The certificate already exists, using them..."
    fi
    ;;

  "owncert")
    echo "===Mode owncert==="

    if [[ ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      echo "Using owmcert..."

      rm -rf /etc/letsencrypt/live/*
      mkdir -p /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}
      cp /owncert/certificate.key /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem
      cp /owncert/certificate.cert /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem

    else
      echo "The certificate already exists, using them..."
    fi
    ;;

  "letsencrypt")
    echo "===Mode letsencrypt==="

    # Auto renew cert
    echo "0 12 * * * certbot renew >> /var/log/nginx/cron-letsencrypt.log" | crontab

    if [[ ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem" && ! -f "/etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem" ]]; then
      echo "Requesting certificate..."

    certbot certonly -n --webroot -w /var/www/certbot -m ${LETSENCRYPT_EMAIL} --agree-tos -d ${DOMAIN_OR_PUBLIC_IP}
    else
      echo "The certificate already exists, using them..."
    fi
    ;;
esac

# All permission certificated folder
chmod -R 777 /etc/letsencrypt

if [ "${NGINX_CONF}" == "custom" ]; then
  rm /etc/nginx/conf.d/*
  cp /custom_nginx_conf/* /etc/nginx/conf.d
else
  rm /etc/nginx/conf.d/*
  cp /default_nginx_conf/* /etc/nginx/conf.d
fi

sed -i "s/{domain_name}/${DOMAIN_OR_PUBLIC_IP}/" /etc/nginx/conf.d/*

# Restart nginx service
service nginx restart

# Init cron
cron -f

tail -f /var/log/nginx/*.log
