#!/bin/sh
cd frontend
ng build --output-path ../../main/resources/static
cd ../../../
mvn -DskipTests=true clean package
java -jar target/openvidu-server-1.0.0-beta.1.jar
