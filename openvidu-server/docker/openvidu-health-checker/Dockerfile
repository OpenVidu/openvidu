FROM ubuntu:20.04

ENV DEBIAN_FRONTEND noninteractive
ENV DISPLAY :99.0

# Install Software
RUN apt-get update && \
    apt-get install -qqy --no-install-recommends \
    gnupg2 \
    xvfb \
    x11-utils \
    wget \
    python3 \
    python3-pip

# Install Chrome and firefox
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update -qqy \
  && apt-get -qqy install \
    google-chrome-stable firefox \
  && rm /etc/apt/sources.list.d/google-chrome.list

RUN pip3 install selenium webdriver_manager prettytable beautifulsoup4

WORKDIR /workdir

COPY ./run.sh ./entrypoint.sh /usr/local/bin/
COPY ./openvidu_health_check.py ./download_webdrivers.py ./
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/run.sh

# Cache web driver
RUN python3 download_webdrivers.py

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

CMD [ "openvidu_health_check.py" ]

