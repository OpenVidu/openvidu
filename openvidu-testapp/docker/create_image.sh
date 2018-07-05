# Copy compiled openvidu-server.jar
cp ../../openvidu-server/target/openvidu-server-"$1".jar ./openvidu-server.jar

# Build and copy openvidu-testapp static files
cd ../
ng build --prod
cp -a dist/. ./docker/web/
cd docker/web
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -subj '/CN=www.mydom.com/O=My Company LTD./C=US' -keyout key.pem -out cert.pem
openssl pkcs12 -export -in cert.pem -inkey key.pem -out keystore.p12 -password pass:CERT_PASS -name CERT_ALIAS -CAfile cert.pem
keytool -importkeystore -srckeystore keystore.p12 -srcstoretype PKCS12 -deststorepass CERT_PASS -srcstorepass CERT_PASS -destkeystore NEW.jks -deststoretype JKS
cd ..


# Build docker image
docker build -t openvidu/testapp .

# Delete unwanted files
rm -rf ./web
rm -rf ./openvidu-server
rm openvidu-server.jar
