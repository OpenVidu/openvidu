FROM ubuntu:24.04
MAINTAINER info@openvidu.io

ENV DEBIAN_FRONTEND=noninteractive

# Install main components
RUN apt-get update && apt-get install -y \
  curl \
  wget \
  openjdk-25-jre \
  jq \
  docker.io \
  ethtool \
  dnsutils \
&& rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/openvidu

COPY openvidu-server-pro-*.jar /opt/openvidu
COPY ./entrypoint.sh /usr/local/bin
COPY ./discover_my_public_ip.sh /usr/local/bin
COPY ./coturn-shared-key.template /usr/local

RUN mkdir -p /opt/openvidu/recordings && \
    chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/discover_my_public_ip.sh

WORKDIR /opt/openvidu

CMD /usr/local/bin/entrypoint.sh
