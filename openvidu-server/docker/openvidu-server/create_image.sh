cp ../../target/openvidu-server-"$1".jar ./openvidu-server.jar

docker build -t openvidu/openvidu-server .

rm ./openvidu-server.jar
