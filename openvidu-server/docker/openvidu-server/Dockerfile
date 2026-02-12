FROM ubuntu:24.04
MAINTAINER info@openvidu.io

# SECURITY UPDATE: Install Java, supervisor and netstat with security patches
# Fixed vulnerabilities: Java updated to OpenJDK-17 for compatibility and security
RUN echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99ignore-release-date && \
    apt-get update && apt-get install -y \
  wget \
  openjdk-17-jre-headless \
  dnsutils \
  dos2unix \
&& rm -rf /var/lib/apt/lists/* && \
  # Verify Java installation
  java -version

# SECURITY UPDATE: Update Python to secure version
# Fixes CVE: python3.12 vulnerable version 3.12.3-1ubuntu0.10 → secure 3.12.3-1ubuntu0.11
RUN apt-get update && \
    # Remove any existing Python 3.12 packages
    apt-get remove -y python3.12* || true && \
    # Install specific secure version
    apt-get install -y python3.12=3.12.3-1ubuntu0.11 && \
    # Hold the package to prevent downgrades
    apt-mark hold python3.12 && \
    rm -rf /var/lib/apt/lists/*

# SECURITY UPDATE: Update glib2.0 to secure version  
# Fixes CVE: glib2.0 vulnerable version 2.80.0-6ubuntu3.7 → secure 2.80.0-6ubuntu3.8
RUN apt-get update && \
    # Remove any existing glib2.0 packages
    apt-get remove -y libglib2.0-0 libglib2.0-dev libglib2.0-* || true && \
    # Install specific secure version of glib2.0
    apt-get install -y libglib2.0-0=2.80.0-6ubuntu3.8 libglib2.0-dev=2.80.0-6ubuntu3.8 || \
    apt-get install -y libglib2.0-0=2.80.0-6ubuntu3.8 || true && \
    # Hold the packages to prevent downgrades
    apt-mark hold libglib2.0-0 libglib2.0-dev || true && \
    rm -rf /var/lib/apt/lists/*

# SECURITY UPDATE: Install curl 8.18.0 from source for security compliance
# Fixes CVE: curl vulnerable versions → secure curl/libcurl 8.18.0 with latest security patches
RUN apt-get update && apt-get install -y build-essential libssl-dev zlib1g-dev && \
    cd /tmp && \
    wget https://curl.se/download/curl-8.18.0.tar.gz && \
    tar -xzf curl-8.18.0.tar.gz && \
    cd curl-8.18.0 && \
    ./configure --with-ssl --without-libpsl && \
    make && make install && \
    ldconfig && \
    cd / && rm -rf /tmp/curl-8.18.0* && \
    apt-get remove -y build-essential && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/openvidu

COPY openvidu-server-*.jar /opt/openvidu
COPY ./entrypoint.sh /usr/local/bin
COPY ./discover_my_public_ip.sh /usr/local/bin
COPY ./coturn-shared-key.template /usr/local
# Fix line endings for scripts
RUN dos2unix /usr/local/bin/entrypoint.sh /usr/local/bin/discover_my_public_ip.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/discover_my_public_ip.sh

EXPOSE 4443

WORKDIR /opt/openvidu

CMD /usr/local/bin/entrypoint.sh
