#!/bin/bash

if [[ -z "$BASEHREF_VERSION" ]]; then
    echo "Example of use: \"BASEHREF_VERSION=2.12.0 ${0}\"" 1>&2
    exit 1
fi

# Replace version from "stable" to the specified one in all TypeDoc links
grep -rl '/latest/' projects src | xargs sed -i -e 's|/latest/|/'${BASEHREF_VERSION}'/|g'

# Replace testapp README by openvidu-components-angular README
mv README.md README-testapp.md
cp ./projects/openvidu-components-angular/README.md .

# Generate Compodoc
npm run doc:build

# Return links to "stable" version
grep -rl '/'${BASEHREF_VERSION}'/' projects src | xargs sed -i -e 's|/'${BASEHREF_VERSION}'/|/latest/|g'

# Undo changes with READMEs
rm README.md
mv README-testapp.md README.md

# Clean previous docs from openvidu.io repo and copy new ones
npm run doc:clean-copy

