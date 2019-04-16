FROM ubuntu:18.04

LABEL maintainer="openvidu@gmail.com"

USER root

RUN apt-get update && apt-get -y upgrade 

RUN apt-get install -y software-properties-common && apt-get install -y --no-install-recommends apt-utils

# Install Kurento Media Server (KMS)
RUN echo "deb [arch=amd64] http://ubuntu.openvidu.io/6.10.0 bionic kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5AFA7A83 \
	&& apt-get update \
	&& apt-get -y install kurento-media-server
RUN sed -i "s/DAEMON_USER=\"kurento\"/DAEMON_USER=\"root\"/g" /etc/default/kurento-media-server

# Install Node
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - && apt-get install -y nodejs

# Java 8
RUN apt-get install -y openjdk-8-jdk-headless

# Maven
RUN apt-get install -y maven

# git
RUN apt-get install -y git

# http-server
RUN npm install -g http-server@latest

# sudo
RUN apt-get -y install sudo

# ffmpeg (for ffprobe)
RUN add-apt-repository ppa:jonathonf/ffmpeg-4
RUN apt-get update
RUN apt-get install -y ffmpeg

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

ENTRYPOINT ["/entrypoint.sh"]
