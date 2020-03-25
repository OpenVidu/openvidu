#!/bin/bash

# Start with default certbot conf
service nginx start

# Show input enviroment variables
echo "Domain name: ${DOMAIN_OR_PUBLIC_IP}"
echo "Certificated: ${CERTIFICATE_TYPE}"
echo "Letsencrypt Email: ${LETSENCRYPT_EMAIL}"

case ${CERTIFICATE_TYPE} in

  "selfsigned")
    echo "Creating selfsigned..."
  
    DOMAIN_OR_PUBLIC_IP="openvidu"
    mkdir -p /etc/letsencrypt/live/openvidu
    openssl req -new -nodes -x509 \
      -subj "/CN=openvidu" -days 365 \
      -keyout /etc/letsencrypt/live/openvidu/privkey.pem -out /etc/letsencrypt/live/openvidu/fullchain.pem -extensions v3_ca
    ;;

  "owncert")
    echo "Using owncert..."

    mkdir -p /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}
    cp /owncert/certificate.key /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/privkey.pem
    cp /owncert/certificate.cert /etc/letsencrypt/live/${DOMAIN_OR_PUBLIC_IP}/fullchain.pem
    ;;

  "letsencrypt")
    echo "Requesting letsencrypt..."

    certbot certonly -n --webroot -w /var/www/certbot -m ${LETSENCRYPT_EMAIL} --agree-tos -d ${DOMAIN_OR_PUBLIC_IP}
    ;;
esac

[ -d "/nginx_conf" ] && rm /etc/nginx/conf.d/* && cp /nginx_conf/* /etc/nginx/conf.d
sed -i "s/{domain_name}/${DOMAIN_OR_PUBLIC_IP}/" /etc/nginx/conf.d/*

service nginx restart
tail -f /var/log/nginx/*.log
