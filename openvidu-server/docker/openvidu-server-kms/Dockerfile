FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Kurento Media Server (KMS) 
RUN echo "deb [arch=amd64] http://ubuntu.openvidu.io/6.10.0 xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5AFA7A83 \
	&& apt-get update \
	&& apt-get -y install kurento-media-server \
	&& rm -rf /var/lib/apt/lists/*

# Install Java, supervisor and netstat
RUN apt-get update && apt-get install -y \
  openjdk-8-jre \
  supervisor \
&& rm -rf /var/lib/apt/lists/*

# Configure supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy OpenVidu Server
COPY openvidu-server.jar openvidu-server.jar

# Copy KMS entrypoint
COPY kms.sh /kms.sh

EXPOSE 8888
EXPOSE 9091
EXPOSE 4443

# Exec supervisord
CMD ["/usr/bin/supervisord"]
