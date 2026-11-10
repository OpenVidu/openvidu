# syntax=docker/dockerfile:1
# Android emulator + Appium for the Android app tests of openvidu-test-e2e. The same image
# also builds that app (src/test/resources/android-app): it has a JDK and the SDK platform,
# so the tests need no other Android tooling. The emulator needs /dev/kvm.
#
# Dependabot (.github/dependabot.yml, group "android-test-environment") keeps up to date the
# versions pinned here and in appium/package-lock.json: the base image and the Node.js image
# below, and Appium with its driver. The Android SDK packages are not in any ecosystem it
# knows: API and CMDLINE_TOOLS are bumped by hand (the others are the latest at build time).

# Node.js for Appium, taken from the official image so that its version is pinned here. Only
# its binary and npm are copied, which run on any glibc distribution, so the tag names no
# Debian release (Dependabot updates the version of a tag, never its suffix)
FROM node:26.13.0-slim AS node

FROM ubuntu:26.04

ARG API=36
ARG CMDLINE_TOOLS=14742923
# No host audio for the emulator (QEMU's null driver): its microphone records silence, and
# the test app mixes a tone into it instead, as the fake microphone of a browser produces
# one. A PulseAudio sine wave as the microphone did not work reliably: whenever an app
# recorded, the guest's audio HAL failed most reads (pcm_readi: I/O error) or got zeros
ENV ANDROID_HOME=/opt/android-sdk \
    APPIUM_HOME=/opt/appium \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    QEMU_AUDIO_DRV=none \
    QEMU_AUDIO_IN_DRV=none \
    QEMU_AUDIO_OUT_DRV=none
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$APPIUM_HOME/node_modules/.bin

# JDK (Gradle builds of the test app, SDK tools, Appium), emulator runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \
      openjdk-17-jdk-headless curl unzip ca-certificates \
      libdbus-1-3 libfontconfig1 libgl1 libnss3 libx11-6 libxcb1 libxcomposite1 \
      libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
 && rm -rf /var/lib/apt/lists/*

# Android SDK (with the platform the test app compiles against), x86_64 system image and AVD.
# The plain AOSP image ("default"), not "google_apis": the Google apps and Play services of
# the latter kept the 4 vCPUs busy and swapping long after boot, and the app under test got
# frames out at 1-2 fps. 4 GB of RAM instead of the device's 2 GB, which swapped as well
RUN curl -fsSL -o /tmp/tools.zip https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS}_latest.zip \
 && mkdir -p $ANDROID_HOME/cmdline-tools \
 && unzip -q /tmp/tools.zip -d $ANDROID_HOME/cmdline-tools \
 && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
 && rm /tmp/tools.zip \
 && yes | sdkmanager --licenses > /dev/null \
 && sdkmanager platform-tools emulator "build-tools;${API}.0.0" "platforms;android-${API}" \
      "system-images;android-${API};default;x86_64" \
 && echo no | avdmanager create avd -n e2e -d pixel_7 -k "system-images;android-${API};default;x86_64" \
 && sed -i 's/^hw.ramSize=.*/hw.ramSize=4G/' /root/.android/avd/e2e.avd/config.ini

# Node.js and npm for Appium, laid out as in the official image (after the Android SDK, so
# that a new Node.js does not download the SDK again), and the library its binary links
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 \
 && rm -rf /var/lib/apt/lists/* \
 && ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && node --version && npm --version

# Appium and its UiAutomator2 driver, at the versions of appium/package-lock.json. Appium finds
# the driver among the npm dependencies of APPIUM_HOME, with no "appium driver install"
COPY appium/package.json appium/package-lock.json $APPIUM_HOME/
RUN cd $APPIUM_HOME && npm ci --no-audit --no-fund \
 && appium driver list --installed 2>&1 | grep -q "uiautomator2@"

COPY --chmod=755 <<'EOF' /start.sh
#!/bin/bash
set -e

# Software GPU (renders remote video), synthetic cameras
emulator -avd e2e -no-window -no-boot-anim -no-snapshot -gpu swiftshader_indirect \
  -camera-front emulated -camera-back emulated &

adb wait-for-device
# No crash or ANR dialogs (the process is restarted instead): the system UI may not answer
# in time while the emulator boots, and its dialog would cover the app under test. Set as
# soon as the settings service answers, before the system UI starts
until adb shell settings put global hide_error_dialogs 1 2> /dev/null; do sleep 1; done
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
for s in window_animation_scale transition_animation_scale animator_duration_scale; do
  adb shell settings put global "$s" 0
done
touch /tmp/ready

exec appium --address 0.0.0.0 --port 4723
EOF

EXPOSE 4723
HEALTHCHECK --interval=5s --start-period=120s --retries=60 \
  CMD test -f /tmp/ready && adb get-state > /dev/null && curl -sf http://localhost:4723/status
CMD ["/start.sh"]
