FROM ubuntu:20.04

LABEL maintainer="info@openvidu.io"

USER root

RUN apt-get update && apt-get -y upgrade 

RUN apt-get install -y \
    software-properties-common \ 
    ca-certificates \
    curl \
    gnupg \
    lsb-release && \
    apt-get install -y --no-install-recommends apt-utils

# Install Node
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - && apt-get install -y nodejs

# Java 11
RUN apt-get install -y openjdk-11-jdk-headless

# Maven
RUN apt-get install -y maven

# git
RUN apt-get install -y git

# http-server
RUN npm install -g http-server@latest

# sudo
RUN apt-get -y install sudo

# ffmpeg (for ffprobe)
RUN apt-get install -y ffmpeg

# docker
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu focal stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io

# docker-compose
RUN apt-get update && apt-get install docker-compose-plugin && \
    curl -fL https://github.com/docker/compose-switch/releases/latest/download/docker-compose-linux-amd64 -o /usr/local/bin/compose-switch && \
    chmod +x /usr/local/bin/compose-switch && \
    update-alternatives --install /usr/local/bin/docker-compose docker-compose /usr/local/bin/compose-switch 99

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y && apt-get autoclean

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

ENTRYPOINT ["/entrypoint.sh"]
