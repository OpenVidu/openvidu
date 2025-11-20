FROM ubuntu:24.04

LABEL maintainer="info@openvidu.io"

USER root

ARG NODE_MAJOR=24
ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt update; \
    apt install -y --no-install-recommends \
        ca-certificates \
        curl \
        wget \
        ffmpeg \
        git \
        gnupg \
        iproute2 \
        lsb-release \
        openjdk-25-jdk \
        rsync \
        software-properties-common \
        sudo; \
    mkdir -p /etc/apt/keyrings; \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg; \
    chmod 0644 /etc/apt/keyrings/nodesource.gpg; \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list; \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg; \
    chmod 0644 /etc/apt/keyrings/docker.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list; \
    apt update; \
    apt install -y --no-install-recommends \
        containerd.io \
        docker-ce \
        docker-ce-cli \
        docker-compose-plugin \
        nodejs; \
    npm install -g http-server@latest; \
    update-alternatives --set java /usr/lib/jvm/java-25-openjdk-amd64/bin/java; \
    apt clean; \
    rm -rf /var/lib/apt/lists/*

ENV MAVEN_VERSION=3.9.11
ENV MAVEN_HOME=/usr/share/maven
ENV PATH=$MAVEN_HOME/bin:$PATH
RUN wget -q https://dlcdn.apache.org/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz && \
    tar -xzf apache-maven-${MAVEN_VERSION}-bin.tar.gz -C /opt && \
    ln -s /opt/apache-maven-${MAVEN_VERSION} $MAVEN_HOME && \
    rm apache-maven-${MAVEN_VERSION}-bin.tar.gz
RUN mvn -v

COPY --chmod=0755 entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
