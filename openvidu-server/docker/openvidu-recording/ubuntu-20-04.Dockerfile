FROM ubuntu:20.04
MAINTAINER info@openvidu.io

ARG CHROME_VERSION

# Install packages
RUN apt-get update && apt-get -y upgrade && apt-get install -y \
    wget \
    sudo \
    gnupg2 \
    apt-utils \
    software-properties-common \
    ffmpeg \
    pulseaudio \
    xvfb \
    jq \
  && rm -rf /var/lib/apt/lists/*

# Install chrome
RUN apt-get update && apt-get -y upgrade && apt-get install -y wget sudo
RUN wget http://dl.google.com/linux/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && apt install -y ./google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && rm google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && google-chrome --version

# Clean
RUN apt-get clean && apt-get autoclean && apt-get autoremove

COPY entrypoint.sh scripts/composed.sh scripts/composed_quick_start.sh ./
RUN ["chmod", "+x", "/entrypoint.sh", "/composed.sh", "/composed_quick_start.sh"]

RUN mkdir /recordings
RUN chmod 777 /recordings

ENTRYPOINT /entrypoint.sh
