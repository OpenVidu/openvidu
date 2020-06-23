VERSION=$1
if [[ ! -z $VERSION ]]; then
    cp ../../target/openvidu-server-*.jar ./openvidu-server.jar
    cp ../utils/discover_my_public_ip.sh ./discover_my_public_ip.sh

    docker build -t openvidu/openvidu-server:$VERSION .

    rm ./openvidu-server.jar
    rm ./discover_my_public_ip.sh
else 
    echo "Error: You need to specify a version as first argument"
fi