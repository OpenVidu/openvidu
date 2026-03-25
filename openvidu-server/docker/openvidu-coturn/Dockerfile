# Change to official coturn when the following PR is merged:
# https://github.com/coturn/coturn/pull/1839
FROM cruizba/coturn:4.9.0-stunfix

USER root

RUN apk add --no-cache bind-tools grep curl

# Override detect-external-ip.sh script
COPY ./detect-external-ip.sh /usr/local/bin/detect-external-ip.sh
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY ./discover-internal-ip.sh /usr/local/bin/discover-internal-ip.sh
COPY ./discover-host-internal-ip.sh /usr/local/bin/discover-host-internal-ip.sh

RUN chmod +x /usr/local/bin/detect-external-ip.sh \
        /usr/local/bin/docker-entrypoint.sh \
        /usr/local/bin/discover-internal-ip.sh \
        /usr/local/bin/discover-host-internal-ip.sh && \
    chown -R nobody:nogroup /var/lib/coturn/ && \
    touch /turnserver.conf && chown nobody:nogroup /turnserver.conf

USER nobody:nogroup
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["--log-file=stdout", "--external-ip=$(detect-external-ip)"]
