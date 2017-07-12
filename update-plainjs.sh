cd openvidu-browser/src/main/resources

npm run updatetsc
npm run browserify

cd ../../../../

# openvidu-insecure-js
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-tutorials/openvidu-insecure-js/web/OpenVidu.js

# openvidu-js-java
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-tutorials/openvidu-js-java/src/main/resources/static/OpenVidu.js

# openvidu-mvc-java
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-tutorials/openvidu-mvc-java/src/main/resources/static/OpenVidu.js

# openvidu-js-node
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-tutorials/openvidu-js-node/public/OpenVidu.js

# openvidu-mvc-node
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-tutorials/openvidu-mvc-node/public/OpenVidu.js

# openvidu-getaroom
cp openvidu-browser/src/main/resources/static/js/OpenVidu.js ../openvidu-tutorials/openvidu-getaroom/web/OpenVidu.js
