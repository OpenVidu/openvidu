FROM elastest/ci-docker-e2e
MAINTAINER openvidu@gmail.com

USER root

RUN apt-get update && apt-get -y install sudo

# Install Kurento Media Server (KMS)
RUN	echo "deb http://ubuntu.kurento.org xenial kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& apt-key adv --keyserver keyserver.ubuntu.com --recv 2F819BC0 \
	&& apt-get update \
	&& apt-get -y dist-upgrade \
	&& apt-get -y install kurento-media-server-6.0 \
    && rm -rf /var/lib/apt/lists/*

# Install Node
RUN sudo curl -sL https://deb.nodesource.com/setup_6.x | sudo bash - && sudo apt-get install -y nodejs

# Install angular-cli
RUN sudo npm install -g @angular/cli

# Install http-server
RUN sudo npm install -g http-server

CMD ["sleep","10"]
