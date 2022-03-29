#!/bin/bash

# if [[ -z "$BASEHREF_VERSION" ]]; then
#     echo "Example of use: \"BASEHREF_VERSION=2.12.0 ${0}\"" 1>&2
#     exit 1
# fi

# Replace version from "stable" to the specified one in all TypeDoc links
# grep -rl '/en/stable/' src | xargs sed -i -e 's|/en/stable/|/en/'${BASEHREF_VERSION}'/|g'

# Generate Compodoc
npm run lib:doc-build

# Return links to "stable" version
# grep -rl '/en/'${BASEHREF_VERSION}'/' src | xargs sed -i -e 's|/en/'${BASEHREF_VERSION}'/|/en/stable/|g'

# Clean previous docs from openvidu.io-docs repo and copy new ones
npm run lib:clean-copy

