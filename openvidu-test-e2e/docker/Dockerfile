FROM ubuntu:16.04

MAINTAINER openvidu@gmail.com

USER root

RUN apt-get update && apt-get -y upgrade 

RUN apt-get install -y software-properties-common && apt-get install -y --no-install-recommends apt-utils

# Install Kurento Media Server (KMS)
RUN	echo "deb http://ubuntu.kurento.org xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv 2F819BC0 \
	&& apt-get update \
	&& apt-get -y dist-upgrade \
	&& apt-get -y install kurento-media-server-6.0

# Install Node
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs

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

# Docker
#RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
#RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
#RUN apt-get update
#RUN apt-get -y install docker-ce

# sudo
RUN apt-get -y install sudo

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

# Jenkins user
#RUN useradd -ms /bin/bash jenkins &&\
#    echo "jenkins:jenkins" | chpasswd
#RUN usermod -aG docker jenkins
#ENV WORKSPACE /home/jenkins
#USER jenkins
#WORKDIR ${WORKSPACE}

ENTRYPOINT ["/entrypoint.sh"]
