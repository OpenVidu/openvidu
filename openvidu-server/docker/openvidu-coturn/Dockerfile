FROM ubuntu:16.04

RUN apt-get update \
    && apt-get install -y coturn curl dnsutils

COPY ./configuration-files.sh /tmp/
COPY ./entrypoint.sh /usr/local/bin
COPY ./discover_my_public_ip.sh /usr/local/bin

RUN chmod +x /tmp/configuration-files.sh \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/discover_my_public_ip.sh

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]