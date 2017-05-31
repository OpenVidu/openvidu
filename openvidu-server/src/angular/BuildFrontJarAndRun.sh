#!/bin/sh
cd frontend
ng build --output-path ../../main/resources/static
cd ../../../
mvn -DskipTests=true clean package
java -jar target/openvidu-server-0.0.1-SNAPSHOT.jar
