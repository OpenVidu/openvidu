#!/bin/bash

if [[ -z "$BASEHREF_VERSION" ]]; then
    echo "Example of use: \"BASEHREF_VERSION=2.12.0 ${0}\"" 1>&2
    exit 1
fi

# Replace version from "stable" to the specified one in all Javadoc links
grep -rl '/en/stable/' ./src | xargs sed -i -e 's|/en/stable/|/en/'${BASEHREF_VERSION}'/|g'

# Generate JavaDoc
mvn javadoc:javadoc
rm -rf ../../openvidu.io/api/openvidu-java-client/*
cp -R ./target/site/apidocs/. ../../openvidu.io-docs/docs/api/openvidu-java-client

# Return links to "stable" version
grep -rl '/en/'${BASEHREF_VERSION}'/' ./src | xargs sed -i -e 's|/en/'${BASEHREF_VERSION}'/|/en/stable/|g'

# Add favicon to index.html
sed -i -e 's/<head>/<head><link rel=\"shortcut icon\" href=\"\/img\/favicon.ico\" type=\"image\/x-icon\">/g' ../../openvidu.io-docs/docs/api/openvidu-java-client/index.html
