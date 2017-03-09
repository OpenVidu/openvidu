OpenVidu
========

OpenVidu is a platform for adding group video calls in your web or mobile 
application. It is based on [Kurento](http://www.kurento.org), the WebRTC platform
for multimedia applications.

OpenVidu and Kurento are licensed under Apache License v2.

OpenVidu was forked from [KurentoRoom project](https://github.com/Kurento/kurento-room).


Developing OpenVidu
===================

First of all, you will need these packages:

```sudo apt-get update```

**node**
```sudo apt-get install nodejs```

**npm**
```sudo apt-get install npm```

**maven**
```sudo apt-get install maven```

**angular-cli**
```sudo npm install -g @angular/cli```

**typescript**
```sudo npm install -g typescript```


OpenVidu structure
------------------

OpenVidu is composed by several modules which require some interconnections in order to have an easy and effortless development.

Here's a simple summary about the structure of OpenVidu:

![OpenVidu structure](https://drive.google.com/uc?export=view&id=0B61cQ4sbhmWScEVBaG00N3l4N00)


 - **Kurento Media Server**: External module which provides the low-level functionalities related to the media transmission. 
How to *install* and *run* KMS in your development machine:

```
echo "deb http://ubuntu.kurento.org trusty kms6" | sudo tee /etc/apt/sources.list.d/kurento.list
wget -O - http://ubuntu.kurento.org/kurento.gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install kurento-media-server-6.0
```

```
sudo service kurento-media-server-6.0 start
sudo service kurento-media-server-6.0 stop
```

[Here](http://doc-kurento.readthedocs.io/en/stable/installation_guide.html) you can check the Kurento's official documentation.

 - [**openvidu-browser**](https://github.com/pabloFuente/openvidu/tree/master/openvidu-browser): Javascript library used to connect the application with openvidu-server
 - [**openvidu-server**](https://github.com/pabloFuente/openvidu/tree/master/openvidu-server): Java API which provides the connection with Kurento Media Server
 - **app**: The application that makes use of OpenVidu. In this repo, [**openvidu-ng-testapp**](https://github.com/pabloFuente/openvidu/tree/master/openvidu-ng-testapp).


Setup for development
------------------
After installing Kurento Media Server and forking or downloading the repo, these are the necessary steps to start developing **openvidu-ng-testapp**:

```
sudo service kurento-media-server-6.0 start
```

**/openvidu/openvidu-browser/src/main/resources**
```
npm install
npm link
```
**/openvidu/openvidu-ng-testapp**
```
npm install
npm link openvidu-browser
ng serve
```
**/openvidu**
```
mvn install -DskipTests=true
```
**/openvidu/openvidu-server**
```
mvn compile exec:java
```

*(or if you prefer you can just run the Java application in your favourite IDE)*


----------


At these point, you can start modifying *openvidu-ng-testapp*, *openvidu-browser* or *openvidu-server*.

 - *openvidu-ng-testapp*:  the previous "ng serve" command will take care of refreshing the browser's page whenever any change takes place.
 - *openvidu-browser*: after modifying any typescript file, you will need to run the following command to update your changes (*typescript* package is necessary):
 
 **/openvidu/openvidu-browser/src/main/resources/ts** 
 ``` 
 tsc
  ```
 - *openvidu-server*: after modifying any file, there is no other alternative but to re-launch the java application if you want to update your changes.

 **/openvidu/openvidu-server** 
 ``` 
 mvn compile exec:java
  ```
*(or re-launch the Java application in your IDE)*
