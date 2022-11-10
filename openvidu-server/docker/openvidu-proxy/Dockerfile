FROM nginx:1.23.2-alpine

# Install required software
RUN apk update && \
    apk add bash \
            certbot \
            openssl \
            apache2-utils \
            bind-tools \
            perl pcre grep && \
    rm -rf /var/cache/apk/*

# Default nginx conf
COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY ./default_nginx_conf /default_nginx_conf

# Entrypoint and discover public ip scripts
COPY ./discover_my_public_ip.sh /usr/local/bin

# Copy nginx.conf
COPY ./nginx.conf /etc/nginx/nginx.conf

# Entrypoint
COPY ./entrypoint.sh /usr/local/bin

RUN mkdir -p /var/www/certbot && \
    mkdir -p /etc/nginx/vhost.d/ && \
    mkdir -p /custom-nginx && \
    chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/discover_my_public_ip.sh

CMD [ "/usr/local/bin/entrypoint.sh" ]
