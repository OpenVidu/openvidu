#!/bin/bash

if [[ -z "$BASEHREF_VERSION" ]]; then
    echo "Example of use: \"BASEHREF_VERSION=3.8.0 ${0}\"" 1>&2
    exit 1
fi

# openvidu.io documentation is versioned by MINOR release (folders like "3.8"), so links to
# it must be pinned to the minor version (X.Y). The full X.Y.Z is left untouched: it is the
# library version, read from package.json by Compodoc and shown in the generated docs.
MINOR_VERSION=$(echo "$BASEHREF_VERSION" | grep -oE '^[0-9]+\.[0-9]+')
if [[ -z "$MINOR_VERSION" ]]; then
    echo "BASEHREF_VERSION must start with X.Y (e.g. \"BASEHREF_VERSION=3.8.0 ${0}\")" 1>&2
    exit 1
fi

# Replace version from "latest" to the specified minor one in all TypeDoc links
grep -rl '/latest/' projects src | xargs sed -i -e 's|/latest/|/'${MINOR_VERSION}'/|g'

# Replace testapp README by openvidu-components-angular README
mv README.md README-testapp.md
cp ./projects/openvidu-components-angular/README.md .

# Generate Compodoc
npm run doc:build

# Return links to "latest" version
grep -rl '/'${MINOR_VERSION}'/' projects src | xargs sed -i -e 's|/'${MINOR_VERSION}'/|/latest/|g'

# Undo changes with READMEs
rm README.md
mv README-testapp.md README.md

# Clean previous docs from openvidu.io repo and copy new ones
npm run doc:clean-copy
