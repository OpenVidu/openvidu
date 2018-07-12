#!/bin/sh
cd frontend
ng build --prod --output-path ../../main/resources/static
cd ../../../
mvn -DskipTests=true clean compile package
