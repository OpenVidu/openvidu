FROM openvidu/openvidu-test-e2e:22.04

RUN apt-get -y update && \
    apt-get install -y wget unzip

# Install Android sdkmanager
RUN mkdir /usr/lib/android-sdk && cd /usr/lib/android-sdk && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-9123335_latest.zip && \
    unzip commandlinetools-linux*.zip && \
    rm commandlinetools-linux*.zip && \
    mkdir latest && mv cmdline-tools/* ./latest && mv latest ./cmdline-tools/.

# Install Android SDK using sdkmanager
RUN yes | /usr/lib/android-sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-32"

# Export ANROID_HOME env variable
ENV ANDROID_HOME /usr/lib/android-sdk

# Cleanup
RUN rm -rf /var/lib/apt/lists/*
RUN apt-get autoremove --purge -y && apt-get autoclean