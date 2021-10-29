FROM ubuntu:20.04

LABEL maintainer="info@openvidu.io"

USER root

RUN apt-get update && apt-get -y upgrade 

RUN apt-get install -y software-properties-common && apt-get install -y --no-install-recommends apt-utils

# Install Node
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && apt-get install -y nodejs

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
RUN apt-get update && apt-get -y install docker.io

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y && apt-get autoclean

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

ENTRYPOINT ["/entrypoint.sh"]
