#!/bin/bash

if [[ ! -z "${whichcert}" && ! -z "${domain_name}" && ! -z "${letsencrypt_email}" ]]; then
  sed -i "s/{domain_name}/${domain_name}/" /etc/nginx/conf.d/*.conf
else
    domain_name="openvidu"
    mkdir -p /etc/letsencrypt/live/openvidu

    openssl req -new -newkey rsa:4096 -days 365 -nodes -x509 \
      -subj "/C=/ST=/L=/O=/CN=openvidu" \
      -keyout /etc/letsencrypt/live/openvidu/privkey.pem \
      -out /etc/letsencrypt/live/openvidu/fullchain.pem
fi

CONFIG_FILES=/etc/nginx/conf.d/*
for file in ${CONFIG_FILES}
do
  echo "$( cat ${file} | sed "s/{domain_name}/${domain_name}/")" > ${file}
done

tail -f /var/log/nginx/*.log
