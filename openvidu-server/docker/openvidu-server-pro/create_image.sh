cp ../utils/discover_my_public_ip.sh ./discover_my_public_ip.sh

docker build -t openvidu/openvidu-server-pro .

rm ./discover_my_public_ip.sh
