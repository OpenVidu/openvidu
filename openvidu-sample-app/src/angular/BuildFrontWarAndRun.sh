#!/bin/sh
cd frontend
ng build --output-path ../../main/resources/static
cd ../../../
mvn clean package
java -jar target/openvidu-sample-app-0.0.1-SNAPSHOT.war
