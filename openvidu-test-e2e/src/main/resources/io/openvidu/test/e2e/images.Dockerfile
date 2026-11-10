# Docker images of openvidu-test-e2e, one stage per image. Never built: PinnedImages
# (openvidu-test-browsers) reads each image by its stage name, and Dependabot
# (.github/dependabot.yml) keeps the tags and digests up to date. The images of the
# server SDK publishers are in src/test/resources/sdk-publishers.Dockerfile; the Android
# emulator image (OpenViduTestE2e.ANDROID_IMAGE) is built in docker/openvidu-test-e2e-android.

# RTSP and SRT server, and the ffmpeg that publishes to it (OpenViduTestE2e)
FROM bluenviron/mediamtx:1.21.3-ffmpeg AS mediamtx

# Network impairments (NetworkConditioner). Pumba 1.x installs netem at reserved handles
# that NetworkConditioner.PUMBA_NETEM_QDISC hard-codes: run the connection quality tests
# on a pull request that bumps it
FROM gaiaadm/pumba:1.6.0 AS pumba

# tc and iptables, run by Pumba. The image has no version tags: Dependabot updates the
# digest to the one of "latest"
FROM ghcr.io/alexei-led/pumba-alpine-nettools:latest@sha256:02a82ce2d64796dbf08fd1277c223eae5b9c9610337ddcb8417da01038cb43a6 AS pumba-nettools
