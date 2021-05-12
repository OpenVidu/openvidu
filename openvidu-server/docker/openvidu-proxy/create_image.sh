VERSION=$1
if [[ ! -z $VERSION ]]; then
    cp ../utils/discover_my_public_ip.sh ./discover_my_public_ip.sh

    docker build --pull --no-cache --rm=true -t openvidu/openvidu-proxy:$VERSION .

    rm ./discover_my_public_ip.sh
else
    echo "Error: You need to specify a version as first argument"
fi
