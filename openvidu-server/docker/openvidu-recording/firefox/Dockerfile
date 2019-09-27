FROM ubuntu:16.04
MAINTAINER openvidu@gmail.com

# Install Firefox
RUN apt-get update && apt-get -y upgrade && apt-get install -y wget sudo
RUN apt-get install -y firefox

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
