FROM ubuntu:16.04

LABEL maintainer="info@openvidu.io"

USER root

RUN apt-get update && apt-get -y upgrade

RUN apt-get install -y software-properties-common && apt-get install -y --no-install-recommends apt-utils

# Install Kurento Media Server (KMS)
RUN echo "deb [arch=amd64] http://ubuntu.openvidu.io/6.15.0 xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5AFA7A83 \
	&& apt-get update \
	&& apt-get -y install kurento-media-server
RUN sed -i "s/DAEMON_USER=\"kurento\"/DAEMON_USER=\"root\"/g" /etc/default/kurento-media-server

# Install Node
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && apt-get install -y nodejs

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

# docker
RUN apt-get update && apt-get -y install docker.io

# Java 11
RUN add-apt-repository ppa:openjdk-r/ppa && \
	apt-get update && \
	apt-get install -y openjdk-11-jdk-headless

# This is a fix: JDK 11 in Ubuntu 16.04 misses Java certs
RUN wget https://download.java.net/openjdk/jdk8u41/ri/openjdk-8u41-b04-linux-x64-14_jan_2020.tar.gz -P /tmp/jdk8
RUN	tar -zxvf /tmp/jdk8/openjdk-*.tar.gz -C /tmp/jdk8 --strip-components=1 && \
	cp /tmp/jdk8/jre/lib/security/cacerts /etc/ssl/certs/java && \
	update-ca-certificates -f && \
	rm -rf /tmp/jdk8

# Maven
RUN apt-get install -y maven

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y && apt-get autoclean

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

ENTRYPOINT ["/entrypoint.sh"]
