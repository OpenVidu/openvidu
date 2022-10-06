FROM ubuntu:22.04
LABEL maintainer="OpenVidu info@openvidu.io"

ARG CHROME_VERSION

# Install packages
RUN apt update && apt -y upgrade && apt install -y \
    wget \
    sudo \
    gnupg2 \
    apt-utils \
    software-properties-common \
    ffmpeg \
    pulseaudio \
    xvfb \
    jq \
    # Language Fonts
    ttf-ancient-fonts fonts-beng fonts-wqy-zenhei fonts-indic \
  && rm -rf /var/lib/apt/lists/*

# Install chrome
RUN apt update && apt -y upgrade && apt install -y wget sudo
RUN wget http://dl.google.com/linux/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && apt install -y ./google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && rm google-chrome-stable_${CHROME_VERSION}_amd64.deb \
  && google-chrome --version

# Add root user to pulseaudio group
RUN adduser root pulse-access

# Clean
RUN apt clean && apt autoclean && apt autoremove

COPY entrypoint.sh scripts/composed.sh scripts/composed_quick_start.sh ./
COPY utils/xvfb-run-safe /usr/local/bin 

# Prepare scripts and folders
RUN chmod +x /entrypoint.sh /composed.sh /composed_quick_start.sh \
  && chmod +x /usr/local/bin/xvfb-run-safe \
  && mkdir /recordings \
  && chmod 777 /recordings

ENTRYPOINT /entrypoint.sh
