#!/bin/bash

# Start with default certbot conf
service nginx start

# Show input enviroment variables
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
      mkdir -p /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}

      openssl req -new -nodes -x509 \
        -subj "/CN=${DOMAIN_OR_PUBLIC_IP}" -days 365 \
        -keyout /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem -out /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem -extensions v3_ca
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
sed -i "s/{domain_name}/${DOMAIN_OR_PUBLIC_IP}/" /etc/nginx/conf.d/*

# Restart nginx service
service nginx restart

# Init cron
cron -f

tail -f /var/log/nginx/*.log
