FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Chrome
RUN apt-get update && apt-get -y upgrade && apt-get install -y wget sudo
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/google-chrome.list && \
  apt-get update && apt-get install -y google-chrome-stable

# Install media packages
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:jonathonf/ffmpeg-4
RUN apt-get update
RUN apt-get install -y ffmpeg pulseaudio xvfb

# Install jq for managing JSON
RUN apt-get install -y jq

# Clean
RUN apt-get autoclean

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]

RUN mkdir /recordings
RUN chmod 777 /recordings

ENTRYPOINT /entrypoint.sh
