cd openvidu-browser/src/main/resources

npm run updatetsc
npm run browserify

cd ../../../../

# openvidu-sample-basic-plainjs
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-tutorials/openvidu-insecure-js/web/OpenVidu.js

cd ../openvidu-docker/openvidu-plainjs-demo
./create_image.sh

docker rm $(docker ps -q -f status=exited)
docker rmi $(docker images -q -f dangling=true)

docker run -p 5000:5000 -p 4040:4040 -e KMS_STUN_IP=193.147.51.12 -e KMS_STUN_PORT=3478 -e openvidu.security=false openvidu/openvidu-plainjs-demo

