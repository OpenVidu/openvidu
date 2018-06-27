FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Java, supervisor and netstat
RUN apt-get update && apt-get install -y \
  openjdk-8-jre \
  supervisor \
&& rm -rf /var/lib/apt/lists/*

# Configure supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy OpenVidu Server
COPY openvidu-server.jar /

EXPOSE 4443
EXPOSE 8888

# Exec supervisord
CMD ["/usr/bin/supervisord"]
