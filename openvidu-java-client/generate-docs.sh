#!/bin/sh

mvn javadoc:javadoc
rm -rf ../../openvidu.io/api/openvidu-java-client/*
cp -R ./target/site/apidocs/. ../../openvidu.io/api/openvidu-java-client