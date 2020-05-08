FROM nginx:1.18.0-alpine

# Install required software
RUN apk update && \ 
    apk add bash \
            certbot \
            openssl \
            apache2-utils && \
    rm -rf /var/cache/apk/*

# Default nginx conf
COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY ./default_nginx_conf /default_nginx_conf

# Entrypoint and discover public ip scripts
COPY ./discover_my_public_ip.sh /usr/local/bin
COPY ./entrypoint.sh /usr/local/bin

RUN mkdir -p /var/www/certbot && \
    chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/discover_my_public_ip.sh

CMD /usr/local/bin/entrypoint.sh
