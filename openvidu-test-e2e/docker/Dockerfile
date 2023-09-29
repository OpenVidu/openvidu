FROM ubuntu:22.04

LABEL maintainer="info@openvidu.io"

USER root

RUN apt-get update && apt-get -y upgrade && \
    apt-get install -y --no-install-recommends apt-utils && \
    apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    ffmpeg \
    git \
    gnupg \
    iproute2 \
    lsb-release \
    maven \
    openjdk-11-jdk-headless \
    rsync \
    software-properties-common \
    sudo && \
    # Node
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    NODE_MAJOR=20 && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install nodejs -y && \
    # Node
    npm install -g http-server@latest && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get autoremove --purge -y && apt-get autoclean

# Docker
RUN sudo mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

ENTRYPOINT ["/entrypoint.sh"]
