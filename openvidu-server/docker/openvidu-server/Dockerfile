FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Java
RUN apt-get update && apt-get install -y openjdk-8-jdk && rm -rf /var/lib/apt/lists/*

# Install supervisor
RUN apt-get update && apt-get install -y supervisor && rm -rf /var/lib/apt/lists/*

# Configure supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy OpenVidu Server
COPY openvidu-server.jar /

EXPOSE 4443
EXPOSE 8888

# Exec supervisord
CMD ["/usr/bin/supervisord"]
