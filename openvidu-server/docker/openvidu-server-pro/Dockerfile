FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

ARG OPENVIDU_VERSION

# Install main components
RUN apt-get update && apt-get install --yes \
    --no-install-recommends \
    openjdk-8-jre \
    jq \
    coturn \
    wget \
    curl \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
    
# OpenVidu
RUN mkdir -p /opt/openvidu /usr/local/bin/ && \
    wget -O /opt/openvidu/openvidu-server.jar \
        https://pro-stripe.openvidu.io/openvidu-server-pro-${OPENVIDU_VERSION}.jar \
        --tries=0 --read-timeout=20

RUN mkdir -p /opt/openvidu/recordings /opt/openvidu/cluster/aws
COPY ./aws/* /opt/openvidu/cluster/aws/
COPY ./entrypoint.sh /usr/local/bin
RUN chmod +x /opt/openvidu/cluster/aws/* && \
    chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /opt/openvidu

CMD /usr/local/bin/entrypoint.sh