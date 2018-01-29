FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Chrome
RUN apt-get update && apt-get install -y wget
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
  apt-get update && apt-get install -y google-chrome-stable

# Install media packages
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:mc3man/xerus-media
RUN apt-get update
RUN apt-get install -y ffmpeg pulseaudio xvfb

# Clean
RUN apt-get autoclean

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

RUN mkdir /recordings

ENTRYPOINT /entrypoint.sh

