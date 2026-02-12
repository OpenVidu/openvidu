# SECURITY UPDATE: Updated from Alpine-based coturn:4.7.0-r2-alpine to Debian-based coturn:latest
# Provides better security patch management and resolves vulnerabilities in libgnutls, libssl, libpq
FROM coturn/coturn:latest

USER root

# SECURITY UPDATE: Update existing packages with security patches  
# Fixes vulnerabilities in system packages while maintaining compatibility
# Fallback mechanism ensures build continues even if repositories are temporarily unavailable
RUN apt update && apt -y upgrade --with-new-pkgs && apt clean && rm -rf /var/lib/apt/lists/* || \
    # Fallback if repositories are unreachable - skip updates but continue build
    echo "Repository access failed, continuing with existing packages"

# Override detect-external-ip.sh script
COPY ./detect-external-ip.sh /usr/local/bin/detect-external-ip.sh
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY ./discover-internal-ip.sh /usr/local/bin/discover-internal-ip.sh

RUN chmod +x /usr/local/bin/detect-external-ip.sh \
        /usr/local/bin/docker-entrypoint.sh \
        /usr/local/bin/discover-internal-ip.sh && \
    sed -i 's/\r$//' /usr/local/bin/detect-external-ip.sh \
        /usr/local/bin/docker-entrypoint.sh \
        /usr/local/bin/discover-internal-ip.sh && \
    chown -R nobody:nogroup /var/lib/coturn/ && \
    touch /turnserver.conf && chown nobody:nogroup /turnserver.conf

USER nobody:nogroup
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["--log-file=stdout", "--external-ip=$(detect-external-ip)"]
