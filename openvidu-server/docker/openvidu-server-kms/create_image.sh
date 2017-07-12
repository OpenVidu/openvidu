cp ../../target/openvidu-server-0.0.1-SNAPSHOT.jar ./openvidu-server.jar

docker build -t openvidu/openvidu-server-kms .

rm ./openvidu-server.jar
