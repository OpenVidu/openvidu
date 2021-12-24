FROM coturn/coturn:4.5.2-alpine

USER root

RUN apk add --no-cache bind-tools grep curl

# Override detect-external-ip.sh script
COPY ./detect-external-ip.sh /usr/local/bin/detect-external-ip.sh
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY ./discover-internal-ip.sh /usr/local/bin/discover-internal-ip.sh

RUN chmod +x /usr/local/bin/detect-external-ip.sh \
        /usr/local/bin/docker-entrypoint.sh \
        /usr/local/bin/discover-internal-ip.sh && \
    chown -R nobody:nogroup /var/lib/coturn/ && \
    touch /turnserver.conf && chown nobody:nogroup /turnserver.conf

USER nobody:nogroup
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["--log-file=stdout", "--external-ip=$(detect-external-ip)"]
