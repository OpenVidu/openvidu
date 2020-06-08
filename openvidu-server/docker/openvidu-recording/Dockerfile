FROM ubuntu:20.04
MAINTAINER openvidu@gmail.com

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

RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get update && DEBIAN_FRONTEND="noninteractive" apt-get install -y google-chrome-stable && rm -rf /var/lib/apt/lists/*

# Clean
RUN apt-get clean && apt-get autoclean && apt-get autoremove

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

RUN mkdir /recordings
RUN chmod 777 /recordings

ENTRYPOINT /entrypoint.sh
