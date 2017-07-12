FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Java
RUN apt-get update && apt-get install -y openjdk-8-jdk && rm -rf /var/lib/apt/lists/*

# Install OpenVidu Server
COPY openvidu-server.jar openvidu-server.jar

EXPOSE 8443
EXPOSE 8888

# Exec supervisord
CMD java -jar /openvidu-server.jar
