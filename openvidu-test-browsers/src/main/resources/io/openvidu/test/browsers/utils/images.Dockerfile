# Docker images of openvidu-test-browsers, one stage per image. Never built:
# PinnedImages reads each image by its stage name, and Dependabot (.github/dependabot.yml)
# keeps the tags and digests up to date.

# ffmpeg and ffprobe (Ffmpeg): a static build with libdav1d, libvpx, libx264, libaom and
# libopus. Pinned with its multi-arch digest, which Dependabot bumps with the tag: an
# image moved under the same tag could decode differently
FROM mwader/static-ffmpeg:9.0.2-1@sha256:f5d100184884eb3e82b0eb14bb5ebf98da99826ac824989720297fb9ef21c822 AS ffmpeg
