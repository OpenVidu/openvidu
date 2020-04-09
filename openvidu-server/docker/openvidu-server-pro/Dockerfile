FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

ARG OPENVIDU_VERSION

# Install main components
RUN apt-get update && apt-get install -y \
  openjdk-8-jre \
    jq \
    coturn \
    wget \
    curl \
  coturn \
  docker.io \
&& rm -rf /var/lib/apt/lists/*
    
# OpenVidu
RUN mkdir -p /opt/openvidu /usr/local/bin/ && \
    wget -O /opt/openvidu/openvidu-server.jar \
        https://pro-stripe.openvidu.io/openvidu-server-pro-${OPENVIDU_VERSION}.jar \
        --tries=0 --read-timeout=20

COPY ./entrypoint.sh /usr/local/bin
RUN mkdir -p /opt/openvidu/recordings && \
    chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /opt/openvidu

CMD /usr/local/bin/entrypoint.sh