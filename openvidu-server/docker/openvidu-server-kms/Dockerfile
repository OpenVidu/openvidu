FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Kurento Media Server (KMS) 
RUN echo "deb http://ubuntu.openvidu.io/6.7.0 xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5AFA7A83 \
	&& apt-get update \
	&& apt-get -y dist-upgrade \
	&& apt-get -y install kurento-media-server

COPY kms.sh /kms.sh

# Install Java
RUN apt-get install -y openjdk-8-jdk

# Install supervisor
RUN apt-get install -y supervisor && rm -rf /var/lib/apt/lists/*

# Configure supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy OpenVidu Server
COPY openvidu-server.jar openvidu-server.jar

EXPOSE 8888
EXPOSE 9091
EXPOSE 8443

# Exec supervisord
CMD ["/usr/bin/supervisord"]
