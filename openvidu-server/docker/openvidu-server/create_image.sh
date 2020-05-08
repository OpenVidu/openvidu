cp ../../target/openvidu-server-*.jar ./openvidu-server.jar
cp ../utils/discover_my_public_ip.sh ./discover_my_public_ip.sh

docker build -t openvidu/openvidu-server .

rm ./openvidu-server.jar
rm ./discover_my_public_ip.sh
