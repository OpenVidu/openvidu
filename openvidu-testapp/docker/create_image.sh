# Copy compiled openvidu-server.jar
cp ../../openvidu-server/target/openvidu-server-"$1".jar ./openvidu-server.jar

# Build and copy openvidu-testapp static files
cd ../
ng build --prod
cp -a dist/. ./docker/web/
cd docker

# Build docker image
docker build -t openvidu/testapp .

# Delete unwanted files
rm -rf ./web
rm -rf ./openvidu-server
rm openvidu-server.jar
