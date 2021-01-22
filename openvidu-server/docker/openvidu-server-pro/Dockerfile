FROM ubuntu:18.04
MAINTAINER info@openvidu.io

# Install main components
RUN apt-get update && apt-get install -y \
  curl \
  wget \
  openjdk-11-jre \
  coturn \
  redis-tools \
  jq \
  docker.io \
  ethtool \
  dnsutils \
&& rm -rf /var/lib/apt/lists/*
    
RUN mkdir -p /opt/openvidu /usr/local/bin/

COPY openvidu-server.jar /opt/openvidu/openvidu-server.jar 
COPY ./entrypoint.sh /usr/local/bin
COPY ./discover_my_public_ip.sh /usr/local/bin
    
RUN mkdir -p /opt/openvidu/recordings && \
    chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/discover_my_public_ip.sh

WORKDIR /opt/openvidu

CMD /usr/local/bin/entrypoint.sh
