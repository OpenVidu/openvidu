#!/bin/sh
cd frontend
ng build --output-path ./../backend/openvidu-sample-app/src/main/resources/static
cd ../backend/openvidu-sample-app
mvn clean package
java -jar target/openvidu-sample-app-0.0.1-SNAPSHOT.war
