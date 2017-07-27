cp ../../target/openvidu-server-1.0.0-beta.1.jar ./openvidu-server.jar

docker build -t openvidu/openvidu-server-kms .

rm ./openvidu-server.jar
