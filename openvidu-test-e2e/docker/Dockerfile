FROM ubuntu:16.04

LABEL maintainer="openvidu@gmail.com"

USER root

RUN apt-get update && apt-get -y upgrade 

RUN apt-get install -y software-properties-common && apt-get install -y --no-install-recommends apt-utils

# Install Kurento Media Server (KMS)
RUN echo "deb http://ubuntu.openvidu.io/6.7.2 xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5AFA7A83 \
	&& apt-get update \
	&& apt-get -y dist-upgrade \
	&& apt-get -y install kurento-media-server \
	&& apt-get -y install openh264-gst-plugins-bad-1.5

# Install Node
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash - && apt-get install -y nodejs

# Java
RUN apt-get install -y default-jdk

# Maven
RUN apt-get install -y maven

# git
RUN apt-get install -y git

# angular-cli
RUN npm install -g @angular/cli

# http-server
RUN npm install -g http-server

# typescript
RUN npm install -g typescript

# sudo
RUN apt-get -y install sudo

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

ENTRYPOINT ["/entrypoint.sh"]
