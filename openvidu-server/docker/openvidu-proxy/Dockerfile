FROM nginx:alpine

# SECURITY UPDATE: Install required software and update vulnerable packages
# Updated base packages for security compliance and vulnerability patching
RUN apk update && apk upgrade && \
    apk add bash \
            openssl \
            apache2-utils \
            bind-tools \
            perl pcre grep \
            py3-pip \
            build-base \
            # SECURITY UPDATE: Update vulnerable packages to latest secure versions
            # Fixes CVE issues in libpng, busybox, ssl_client, py3-urllib3
            libpng \
            busybox \
            ssl_client \
            py3-urllib3 \
    && rm -rf /var/cache/apk/*

# SECURITY UPDATE: Install certbot and update vulnerable Python packages to secure versions via pip
# Fixes CVE: jaraco.context 5.3.0 → 6.1.0, wheel old version → 0.46.2, pip to latest
# Using pip instead of Alpine packages to ensure latest security patches
RUN pip3 install --upgrade --break-system-packages pip setuptools && \
    pip3 install --upgrade --break-system-packages certbot jaraco.context==6.1.0 wheel==0.46.2 && \
    # Remove Alpine Python packages that might conflict with newer pip versions
    apk del py3-pip py3-wheel py3-setuptools || true

# SECURITY UPDATE: Install curl 8.18.0 from source for security compliance
# Fixes CVE: curl/libcurl vulnerable versions (8.17.0-r1) → secure curl/libcurl 8.18.0
# Custom build ensures latest security patches and removes old vulnerable versions
RUN apk add build-base openssl-dev && \
    cd /tmp && \
    wget https://curl.se/download/curl-8.18.0.tar.gz && \
    tar -xzf curl-8.18.0.tar.gz && \
    cd curl-8.18.0 && \
    ./configure --with-ssl --without-libpsl && \
    make && make install && \
    cd / && rm -rf /tmp/curl-8.18.0* && \
    # Remove any existing system curl packages to prevent version conflicts
    apk del curl libcurl || true && \
    apk del build-base openssl-dev

# Default nginx conf
COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY ./default_nginx_conf /default_nginx_conf

# Entrypoint and discover public ip scripts
COPY ./discover_my_public_ip.sh ./update_enterprise_ha_nodes.sh  /usr/local/bin/

# Copy nginx.conf
COPY ./nginx.conf /etc/nginx/nginx.conf

# Entrypoint
COPY ./entrypoint.sh /usr/local/bin

RUN mkdir -p /var/www/certbot && \
    mkdir -p /etc/nginx/vhost.d/ && \
    mkdir -p /custom-nginx && \
    chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/discover_my_public_ip.sh && \
    chmod +x /usr/local/bin/update_enterprise_ha_nodes.sh && \
    # Fix line endings for shell scripts
    sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
        /usr/local/bin/discover_my_public_ip.sh \
        /usr/local/bin/update_enterprise_ha_nodes.sh

CMD [ "/usr/local/bin/entrypoint.sh" ]
