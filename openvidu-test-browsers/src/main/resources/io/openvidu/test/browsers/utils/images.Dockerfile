# Docker images of openvidu-test-browsers, one stage per image. Never built:
# PinnedImages reads each image by its stage name, and Dependabot (.github/dependabot.yml)
# keeps the tags and digests up to date.

# ffmpeg and ffprobe (Ffmpeg): a static build with libdav1d, libvpx, libx264, libaom and
# libopus. Pinned with its multi-arch digest, which Dependabot bumps with the tag: an
# image moved under the same tag could decode differently
FROM mwader/static-ffmpeg:9.0.2@sha256:7d9bdaaf887f7e6ce6151f67325c344074b5ff1fb75316011c3376503e449a7b AS ffmpeg
