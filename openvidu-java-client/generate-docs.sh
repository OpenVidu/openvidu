#!/bin/sh

mvn javadoc:javadoc
rm -rf ../../openvidu.io/api/openvidu-java-client/*
cp -R ./target/site/apidocs/. ../../openvidu.io/api/openvidu-java-client

# Add favicon to index.html
sed -i -e 's/<head>/<head><link rel=\"shortcut icon\" href=\"\/img\/favicon.ico\" type=\"image\/x-icon\">/g' ../../openvidu.io/api/openvidu-java-client/index.html
