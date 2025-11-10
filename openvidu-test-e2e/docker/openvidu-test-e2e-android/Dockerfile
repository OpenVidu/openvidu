FROM openvidu/openvidu-test-e2e:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_HOME=/opt/android-sdk \
    CMDLINE_TOOLS_VERSION=11076708 \
    ANDROID_PLATFORM=android-34

ENV PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends unzip; \
    mkdir -p "$ANDROID_SDK_ROOT"; \
    curl -fsSLo /tmp/cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"; \
    unzip /tmp/cmdline-tools.zip -d "$ANDROID_SDK_ROOT"; \
    rm /tmp/cmdline-tools.zip; \
    mv "$ANDROID_SDK_ROOT"/cmdline-tools "$ANDROID_SDK_ROOT"/cmdline-tools-temp; \
    mkdir -p "$ANDROID_SDK_ROOT"/cmdline-tools; \
    mv "$ANDROID_SDK_ROOT"/cmdline-tools-temp "$ANDROID_SDK_ROOT"/cmdline-tools/latest; \
    yes | "$ANDROID_SDK_ROOT"/cmdline-tools/latest/bin/sdkmanager --sdk_root="$ANDROID_SDK_ROOT" "platform-tools" "platforms;${ANDROID_PLATFORM}"; \
    apt-get purge -y --auto-remove unzip; \
    rm -rf /var/lib/apt/lists/*
