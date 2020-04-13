FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Java, supervisor and netstat
RUN apt-get update && apt-get install -y \
  openjdk-8-jre \
  coturn \
&& rm -rf /var/lib/apt/lists/*

# Copy OpenVidu Server
COPY openvidu-server.jar /
COPY ./entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4443

CMD /usr/local/bin/entrypoint.sh
