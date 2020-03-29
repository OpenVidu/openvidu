cp ../../target/openvidu-server-*.jar ./openvidu-server.jar

docker build -t openvidu/openvidu-server .

rm ./openvidu-server.jar
