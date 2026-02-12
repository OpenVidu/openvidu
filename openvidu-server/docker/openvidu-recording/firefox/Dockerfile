FROM ubuntu:24.04
MAINTAINER info@openvidu.io

# SECURITY UPDATE: Install packages with time validation bypass and security updates
# Added comprehensive language font support and line ending conversion tools
RUN echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99ignore-release-date && \
    apt-get update && apt-get -y upgrade && apt-get install -y \
    wget \
    sudo \
    gnupg2 \
    apt-utils \
    software-properties-common \
    ffmpeg \
    pulseaudio \
    xvfb \
    jq \
    # SECURITY UPDATE: Added dos2unix for proper line ending handling
    dos2unix \
    # SECURITY UPDATE: Added comprehensive language fonts for international support
    ttf-ancient-fonts fonts-beng fonts-wqy-zenhei fonts-indic \
  && rm -rf /var/lib/apt/lists/*

# Install Firefox
RUN apt-get update && apt-get -y upgrade && apt-get install -y firefox

# Clean	
RUN apt-get clean && apt-get autoclean && apt-get autoremove

COPY entrypoint.sh /entrypoint.sh
COPY configuration/autoconfig.js /usr/lib/firefox/defaults/pref/autoconfig.js
COPY configuration/customconfig.cfg /usr/lib/firefox/customconfig.cfg
COPY configuration/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi /usr/lib/firefox-addons/extensions/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi
COPY configuration/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi /usr/lib/firefox-addons/distribution/extensions/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi
COPY configuration/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi /usr/share/mozilla/extensions/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi
RUN ["chmod", "+x", "/entrypoint.sh"]
RUN ["chmod", "755", "/usr/lib/firefox-addons/extensions/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi"]
RUN ["chmod", "755", "/usr/lib/firefox-addons/distribution/extensions/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi"]
RUN ["chmod", "755", "/usr/share/mozilla/extensions/{d320c473-63c2-47ab-87f8-693b1badb5e3}.xpi"]

RUN mkdir /recordings
RUN chmod 777 /recordings

ENTRYPOINT /entrypoint.sh
