cp ../../target/openvidu-server-0.0.1-SNAPSHOT.jar ./openvidu-server.jar

docker build -t openvidu/openvidu-server .

rm ./openvidu-server.jar
