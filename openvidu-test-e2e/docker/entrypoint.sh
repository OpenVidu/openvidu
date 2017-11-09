#!/bin/bash

/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf &

git clone https://github.com/OpenVidu/openvidu.git

echo
echo "cd openvidu"
echo

cd openvidu

echo
echo "mvn compile && mvn install"
echo

mvn -DskipTests=true compile && mvn -DskipTests=true install

echo
echo "cd openvidu-browser"
echo

cd  openvidu-browser

echo
echo "npm install"
echo

npm install --unsafe-perm

echo
echo "npm link"
echo

npm link --unsafe-perm

echo
echo "cd ../openvidu-testapp"
echo

cd ../openvidu-testapp

echo
echo "npm install"
echo

npm install

echo
echo "npm link openvidu-browser"
echo

npm link openvidu-browser

echo
echo "ng build"
echo

ng build

echo
echo "http-server dist/"
echo

http-server -p 4200 ./dist &> testapp.log &

until $(curl --output /dev/null --silent --head --fail http://localhost:4200/); do
    echo 'waiting for openvidu-testapp...'
    sleep 3
done

echo
echo "cd ../openvidu-server"
echo

cd ../openvidu-server

echo
echo "service kurento-media-server-6.0 start"
echo

service kurento-media-server-6.0 start

echo
echo "mvn clean compile package exec:java"
echo

mvn -DskipTests=true clean compile package exec:java &> openvidu-server.log &

echo
echo "cd ../openvidu-test-e2e"
echo

cd ../openvidu-test-e2e

until $(curl --insecure --output /dev/null --silent --head --fail https://OPENVIDUAPP:MY_SECRET@localhost:8443/); do
    echo 'waiting for openvidu-server...'
    sleep 5
done

echo
echo "mvn test"
echo

mvn test
