FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Java, supervisor and netstat
RUN apt-get update && apt-get install -y \
  curl \
  wget \
  openjdk-8-jre \
  coturn \
&& rm -rf /var/lib/apt/lists/*

# Copy OpenVidu Server
COPY openvidu-server.jar /
COPY ./entrypoint.sh /usr/local/bin
COPY ./discover_my_public_ip.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/discover_my_public_ip.sh

EXPOSE 4443

CMD /usr/local/bin/entrypoint.sh
