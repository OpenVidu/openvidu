cp ../utils/discover_my_public_ip.sh ./discover_my_public_ip.sh

docker build --rm -t openvidu/openvidu-coturn .

rm ./discover_my_public_ip.sh
