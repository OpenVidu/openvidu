cd openvidu-browser/src/main/resources

npm run updatetsc
npm run browserify

cd ../../../../

# openvidu-sample-basic-plainjs
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-sample-basic-plainjs/web/OpenVidu.js

# openvidu-sample-secure
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-sample-secure/src/main/resources/static/OpenVidu.js

# openvidu-sample-secure-mvc
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-sample-secure-mvc/demo-java-mvc-secure/src/main/resources/static/OpenVidu.js

# openvidu-sample-secure-spa-node
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-sample-secure-spa-node/public/OpenVidu.js

# openvidu-sample-secure-mvc-node
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-sample-secure-mvc-node/public/OpenVidu.js
