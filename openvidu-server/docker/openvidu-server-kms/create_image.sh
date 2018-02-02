cp ../../target/openvidu-server-"$1".jar ./openvidu-server-cbx.jar

docker build -t councilbox/server-kms .

rm ./openvidu-server-cbx.jar
