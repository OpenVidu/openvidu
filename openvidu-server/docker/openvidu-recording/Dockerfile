# SECURITY UPDATE: Updated base image from Ubuntu 24.04 to 26.04 for latest security patches
FROM ubuntu:26.04
LABEL maintainer="OpenVidu info@openvidu.io"

# SECURITY UPDATE: Install packages including dos2unix for line ending conversion
# Added security updates and additional language fonts for international support
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
    # SECURITY UPDATE: Added dos2unix for proper line ending handling in cross-platform development
    dos2unix \
    # SECURITY UPDATE: Added language fonts for better international character support and security
    ttf-ancient-fonts fonts-beng fonts-wqy-zenhei fonts-indic \
  && rm -rf /var/lib/apt/lists/*

# SECURITY UPDATE: Install latest stable Chrome browser with updated GPG key handling
# Fixed deprecated apt-key usage and updated URLs for improved security
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
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
  && dos2unix /entrypoint.sh /composed.sh /composed_quick_start.sh /broadcast.sh /headless-chrome.sh /usr/local/bin/xvfb-run-safe \
  && mkdir /recordings \
  && chmod 777 /recordings

ENTRYPOINT /entrypoint.sh
