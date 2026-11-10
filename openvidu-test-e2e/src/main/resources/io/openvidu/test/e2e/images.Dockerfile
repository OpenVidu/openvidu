# Docker images of openvidu-test-e2e, one stage per image. Never built: PinnedImages
# (openvidu-test-browsers) reads each image by its stage name, and Dependabot
# (.github/dependabot.yml) keeps the tags and digests up to date. The images of the
# server SDK publishers are in src/test/resources/sdk-publishers.Dockerfile; the Android
# emulator image (OpenViduTestE2e.ANDROID_IMAGE) is built in docker/openvidu-test-e2e-android.

# RTSP and SRT server, and the ffmpeg that publishes to it (OpenViduTestE2e)
FROM bluenviron/mediamtx:1.21.0-ffmpeg AS mediamtx

# Network impairments (NetworkConditioner). Pumba 1.x installs netem at reserved handles
# that NetworkConditioner.PUMBA_NETEM_QDISC hard-codes: run the connection quality tests
# on a pull request that bumps it
FROM gaiaadm/pumba:1.6.0 AS pumba

# tc and iptables, run by Pumba. The image has no version tags: Dependabot updates the
# digest to the one of "latest"
FROM ghcr.io/alexei-led/pumba-alpine-nettools:latest@sha256:bdcfacdd0c42f64cd280319d6dd5d3911f33425ce4a5168bb1b7de9570b72cd1 AS pumba-nettools
