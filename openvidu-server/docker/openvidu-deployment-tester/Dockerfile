FROM ubuntu:24.04

ENV DEBIAN_FRONTEND noninteractive \
    DISPLAY :99.0 \
    GECKO_DRIVER_LOCATION /usr/local/bin/geckodriver \
    CHROME_DRIVER_LOCATION /usr/local/bin/chromedriver

# Install Software
RUN apt-get update && \
    apt-get install -qqy --no-install-recommends \
    lbzip2 \
    gnupg2 \
    xvfb \
    x11-utils \
    wget \
    python3 \
    python3-pip \
    ffmpeg

# Install latest chrome
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt install -y ./google-chrome-stable_current_amd64.deb && \
    rm google-chrome-stable_current_amd64.deb

# Install non snap version of firefox
ENV FF_INSTALLER_NAME=firefox-latest.tar.bz2
RUN cd /tmp && \
    apt-get update && apt-get install libdbus-glib-1-2 -y && \
    rm -rf /var/lib/apt/lists/* && \
    wget --progress=dot:mega -O ${FF_INSTALLER_NAME} \
         'https://download.mozilla.org/?product=firefox-latest-ssl&os=linux64&lang=en-US' && \
    tar -x -C /usr/local/bin -f ${FF_INSTALLER_NAME} && \
    rm -f ${FF_INSTALLER_NAME} && \
    ln -s /usr/local/bin/firefox/firefox /usr/bin/firefox

# Copy source code and install dependencies
COPY ./src/ /workdir/src/
COPY ./requirements.txt /workdir/
RUN cd /workdir && pip3 install -r requirements.txt

WORKDIR /workdir/src

# Cache web driver
# TODO: Fix cache
# RUN python3 main.py install-drivers

# Copy entrypoint
COPY ./entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
