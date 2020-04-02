FROM nginx:1.17.9

# Install certbot
RUN apt-get update && \
    apt-get install -y python python-dev libffi6 libffi-dev libssl-dev curl build-essential procps cron apache2-utils && \
    curl -L 'https://bootstrap.pypa.io/get-pip.py' | python && \
    pip install -U cffi certbot && \
    mkdir -p /var/www/certbot && \
    apt remove --purge -y python-dev build-essential libffi-dev libssl-dev curl && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Default nginx conf
COPY ./default.conf /etc/nginx/conf.d/default.conf
COPY ./default_nginx_conf /default_nginx_conf

# Entrypoint
COPY ./entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh

CMD /usr/local/bin/entrypoint.sh