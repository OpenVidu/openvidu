FROM nginx:1.18.0-alpine

# Install certbot
RUN apk update && \
    apk add certbot && \
    apk add openssl && \
    apk add apache2-utils && \
    rm -rf /var/cache/apk/*

# Default nginx conf
COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY ./default_nginx_conf /default_nginx_conf

# Entrypoint
COPY ./entrypoint.sh /usr/local/bin
RUN mkdir -p /var/www/certbot && \
    chmod +x /usr/local/bin/entrypoint.sh

CMD /usr/local/bin/entrypoint.sh
