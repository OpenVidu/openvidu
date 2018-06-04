FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Kurento Media Server (KMS) 
RUN echo "deb http://ubuntu.openvidu.io/6.7.2 xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5AFA7A83 \
	&& apt-get update \
	&& apt-get -y dist-upgrade \
	&& apt-get -y install kurento-media-server \
	&& apt-get -y install openh264-gst-plugins-bad-1.5

# Install Java
RUN apt-get install -y openjdk-8-jdk

# Configure Supervisor
RUN mkdir -p /var/log/supervisor
RUN apt-get install -y supervisor && rm -rf /var/lib/apt/lists/*

# Copy all files
COPY kms.sh /kms.sh
COPY web /web/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY openvidu-server.jar openvidu-server.jar

EXPOSE 4443

# Exec supervisord
CMD ["/usr/bin/supervisord"]
