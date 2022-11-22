FROM ubuntu:22.04

LABEL maintainer="info@openvidu.io"

USER root

RUN apt-get update && apt-get -y upgrade 

RUN apt-get install -y \
    software-properties-common \ 
    apt-transport-https \
    rsync \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    iproute2 && \
    apt-get install -y --no-install-recommends apt-utils

# Install Node
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs

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
RUN sudo mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y && apt-get autoclean

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

ENTRYPOINT ["/entrypoint.sh"]
