#!/bin/bash -x
set -eu -o pipefail
VERSION=$1
if [[ -n $VERSION ]]; then
    rm -rf dockerfiles/
    # Clone elasticsearch repositories
    git clone https://github.com/elastic/dockerfiles
    # Go to the specified version
    cd dockerfiles || exit 1
    git checkout v"${VERSION}"
    cd ..
    # Copy the patch into elasticsearch directory
    cp elasticsearch_"${VERSION}"_patch_log4j.diff dockerfiles/elasticsearch
    # Enter elasticsearch directory
    cd dockerfiles/elasticsearch || exit 1
    # Patch Dockerfile
    patch < elasticsearch_"${VERSION}"_patch_log4j.diff
    docker build --pull --no-cache --rm=true -t openvidu/openvidu-elasticsearch:"$VERSION" .
    cd ../../ && rm -rf dockerfiles/
else
    echo "Error: You need to specify a version as first argument"
fi
