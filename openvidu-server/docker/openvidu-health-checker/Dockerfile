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

RUN pip3 install selenium webdriver_manager prettytable

COPY ./run.sh /usr/local/bin/run.sh
COPY ./openvidu_helth_check.py /usr/local/bin/openvidu_helth_check
RUN chmod +x /usr/local/bin/run.sh /usr/local/bin/openvidu_helth_check

WORKDIR /workdir

ENTRYPOINT [ "/usr/local/bin/run.sh" ]

CMD [ "openvidu_helth_check" ]

