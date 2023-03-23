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

# Install latest stable Chrome browser
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 4CCA1EAF950CEE4AB83976DCA040830F7FAC5991 \
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
  && apt update \
  && apt install -y google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*

# Add root user to pulseaudio group
RUN adduser root pulse-access

# Clean
RUN apt clean && apt autoclean && apt autoremove

COPY entrypoint.sh scripts/composed.sh scripts/composed_quick_start.sh scripts/broadcast.sh ./
COPY utils/xvfb-run-safe /usr/local/bin
COPY utils/headless-chrome.sh ./

# Prepare scripts and folders
RUN chmod +x /entrypoint.sh /composed.sh /composed_quick_start.sh /broadcast.sh /headless-chrome.sh \
  && chmod +x /usr/local/bin/xvfb-run-safe \
  && mkdir /recordings \
  && chmod 777 /recordings

ENTRYPOINT /entrypoint.sh
