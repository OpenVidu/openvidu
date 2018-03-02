FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Kurento Media Server (KMS) 
RUN echo "deb http://ubuntu.kurento.org xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
 && apt-key adv --keyserver keyserver.ubuntu.com --recv 2F819BC0 \
 && apt-get update \
 && apt-get -y dist-upgrade \
 && apt-get -y install kurento-media-server-6.0 \
 && rm -rf /var/lib/apt/lists/*

# Install Java
RUN apt-get update && apt-get install -y openjdk-8-jdk && rm -rf /var/lib/apt/lists/*

# Configure Supervisor
RUN mkdir -p /var/log/supervisor
RUN apt-get update && apt-get install -y supervisor && rm -rf /var/lib/apt/lists/*

# Copy all files
COPY kms.sh /kms.sh
COPY web /web/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY openvidu-server.jar openvidu-server.jar

EXPOSE 8443

# Exec supervisord
CMD ["/usr/bin/supervisord"]
