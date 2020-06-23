VERSION=$1
if [[ ! -z $VERSION ]]; then
    docker build --rm -t openvidu/openvidu-redis:$VERSION .
else
    echo "Error: You need to specify a version as first argument"
fi
