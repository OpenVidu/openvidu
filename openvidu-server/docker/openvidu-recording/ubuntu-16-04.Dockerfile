FROM ubuntu:16.04
MAINTAINER info@openvidu.io

ARG CHROME_VERSION

# Install Chrome
RUN apt-get update && apt-get -y upgrade && apt-get install -y wget sudo
RUN wget http://dl.google.com/linux/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && apt install -y ./google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && rm google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && google-chrome --version

# Install media packages
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:jonathonf/ffmpeg-4
RUN apt-get update
RUN apt-get install -y ffmpeg pulseaudio xvfb

# Install jq for managing JSON
RUN apt-get install -y jq

# Clean
RUN apt-get autoclean

COPY entrypoint.sh scripts/composed.sh scripts/composed_quick_start.sh ./
RUN ["chmod", "+x", "/entrypoint.sh", "/composed.sh", "/composed_quick_start.sh"]

RUN mkdir /recordings
RUN chmod 777 /recordings

ENTRYPOINT /entrypoint.sh