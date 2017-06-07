What is OpenVidu?
========

OpenVidu is a platform to facilitate the addition of video calls in your web or mobile 
application, either group or one-to-one calls. In fact, any combination you come up with is easy to implement with OpenVidu.

It is based on [Kurento](http://www.kurento.org), the WebRTC platform for multimedia applications. Openvidu was forked from [KurentoRoom project](https://github.com/Kurento/kurento-room).

OpenVidu and Kurento are licensed under Apache License v2.

----------


Table of contents
========

* [Running a videocall demo](#running-a-videocall-demo-application)
* [Building a simple app](#building-a-simple-app-with-openvidu)
* [Securization](#securization)
* [Sharing data between users](#sharing-data-between-users)
* [API Reference](#api-reference)
* [Deploying on AWS](#deploying-on-aws)
* [Developing OpenVidu](#developing-openvidu)
* [Acknowledgments](#acknowledgments)

----------


Running a videocall demo application
====================================
We have implemented a very basic demo application to see OpenVidu in action. To ease the installation, we have packaged it as a docker image. 

 - Please be sure that you have [docker CE installed](https://store.docker.com/search?type=edition&offering=community)
 - Run this Docker container
   
   ```
   docker run -p 5000:5000 -p 4040:4040 -e KMS_STUN_IP=193.147.51.12 -e KMS_STUN_PORT=3478 -e openvidu.security=false openvidu/openvidu-plainjs-demo
   ```
   
 - Wait until you see a public URL ended with _ngrok.io_. You can share this URL with anyone you want to tests the app over the Internet!
 
----------

Building a simple app with OpenVidu
===================

<p align="center">
  <img src="https://docs.google.com/uc?id=0B61cQ4sbhmWSNF9ZWHREUXo3QlE">
</p>

OpenVidu has a traditional **Client - Server** architecture built on three modules that are shown in the image above. To run **openvidu-server** and **Kurento Media Server** you can execute the following container: 

```
docker run -p 8443:8443 --rm -e KMS_STUN_IP=193.147.51.12 -e KMS_STUN_PORT=3478 -e openvidu.security=false openvidu/openvidu-server-kms
```
 
 
Then, you have to use the library **openvidu-browser** in your JavaScript browser application (frontend). This library is packaged in [OpenVidu.js] file that you can download from https://github.com/OpenVidu/openvidu/blob/master/openvidu-browser/src/main/resources/static/js/OpenVidu.js. Then add the file in your HTML with `<script src="OpenVidu.js"></script>`.

With the **openvidu-browser** library you can handle all available operations straight away from your client, as creating video calls, joining users to them or publishing/unpublishing video and audio


## Sample application


Once you have up and running Kurento Media Server and openvidu-server, you just need to add a few lines of code in your frontend to make your first video call with OpenVidu. You can take a look to the sample application in GitHub https://github.com/OpenVidu/openvidu-sample-basic-plainjs.

You can clone the repo and serve the app locally with your favourite tool (we recommend http-server: `npm install -g http-server`)

   ```
   git clone https://github.com/OpenVidu/openvidu-sample-basic-plainjs.git
   cd openvidu-sample-basic-plainjs/web
   http-server
   ```
You can now start editing HTML, JS and CSS files. Just reload your browser to see your changes (mind the browser's cache!).

### Code description


1. Get an *OpenVidu* object and initialize a session with a *sessionId*. Have in mind that this is the parameter that defines which video call to connect.

	```javascript
	var OV = new OpenVidu("wss://" + OPENVIDU_SERVER_IP + ":8443/");
    var session = OV.initSession(sessionId);
    ```
2. Set the events to be listened by your session. For example, this snippet below will automatically append the new participants videos to HTML element with 'subscriber' id. Available events for the Session object are detailed in [API section](#session).

	```javascript
	session.on('streamCreated', function (event) {
		session.subscribe(event.stream, 'subscriber');
	});
    ```
3. Connect to the session. For a non-secure approach, the value of *token* parameter is irrelevant. You can pass as second parameter a callback to be executed after connection is stablished. A common use-case for users that want to stream their own video is the following one: if the connection to the session has been succesful, get a Publisher object (appended to HTML element with id 'publisher') and publish it. The rest of participants will receive the stream.

	```javascript
	session.connect(token, function (error) {
		// If connection successful, get a publisher and publish to the session
		if (!error) {
			var publisher = OV.initPublisher('publisher', {
				audio: true,
				video: true,
				quality: 'MEDIUM' //'LOW','MEDIUM','HIGH'
			});
			session.publish(publisher);
		} else {
			console.log('Error while connecting to the session');
		}
	});
    ```
4. Finally, whenever you want to leave the video call...

	```javascript
	session.disconnect();
    ```

With these few lines of code you will already have a functional video-call capability in your app. Check [Securization](#securization) section to learn how to easily make your app ready for production.

If you prefer, there's an Angular version of the sample app that uses _openvidu-browser_ npm package. Check it out [here](https://github.com/OpenVidu/openvidu-sample-basic-ng2).

----------

Securization
===================


## Why?


In a production environment probably you don't want unauthorized users swamping your video calls. It's not possible to control access to them with the first approach we have seen in the sections above: anyone who knows the _sessionId_ could connect to your video call, and if it turns out that the _sessionId_ doesn't belong to an existing session, a new one would be created.

In addition, a secure version also means you can choose the role each user has in your video calls (see [OpenViduRole](#openvidurole) section).

Thus, a non-secure version of OpenVidu is only intended for development environments. Don't worry, adding securization is not a difficult task.

## How?


<p align="center">
  <img src="https://docs.google.com/uc?id=0B61cQ4sbhmWSeDNIekd5R2ZhQUE">
</p>

In the image above you can see the main difference with the non-secure version of OpenVidu. Your backend will now have to call two HTTP REST operations in openvidu-server to get the two parameters needed in the securization process:

 - ***sessionId***: just as in the non-secure version, it identifies each specific video-call
 - ***token***: any user joining a specific video call will need to pass a valid token as a parameter

For the moment you have two options available for getting sessionIds and tokens from openvidu-server:

#### REST API
As stated in the former point, two REST operations are provided: ***/getSessionId*** and ***/newToken***.
Both operations have in common the header referred to authorization. It is implemented via Basic Auth, and it is as simple as applying Base64 encoding to the username (always "OPENVIDUAPP") and the password (your **secret** shared with openvidu-server). An example is shown below:

For secret "MY_SECRET", the final header would be

> Authorization:Basic T1BFTlZJRFVBUFA6TVlfU0VDUkVU


| _GET A SESSION ID_ | _PARAMETERS_ |
| ---------       | -- |
| **Operation** | POST |
| **URL** | https://[YOUR_OPENVIDUSERVER_IP]/sessions |
| **Headers** | Authorization:Basic _EncodeBase64(OPENVIDUAPP:[YOUR_SECRET])_ |
| **Returns** | {"id": "SESSIONID"} |

| _CREATE NEW TOKEN_ | _PARAMETERS_ |
| ---------       | -- |
| **Operation** | POST |
| **URL** | https://[YOUR_OPENVIDUSERVER_IP]/tokens |
| **Headers** | Authorization:Basic _EncodeBase64(OPENVIDUAPP:[YOUR_SECRET])_<br/>Content-Type:application/json |
| **Body** | {"session": "SESSIONID", "role": "ROLE", "data": "DATA"} |
| **Returns** | {"token": "TOKEN", "session": "SESSIONID", "role": "ROLE", "data": "DATA", "id": "TOKEN"} |


> **ROLE** value in Body field of POST to "/newToken" can be:
> 
> - SUBSCRIBER
> - PUBLISHER
> - MODERATOR
> 
> (See [OpenViduRole](#openvidurole) section)

#### openvidu-backend-client
A Java package that wraps the HTTP REST operations for making them even easier

- Maven dependency
	```xml
	<dependency>
	    <groupId>io.openvidu</groupId>
	    <artifactId>openvidu-java-client</artifactId>
	    <version>...</version>
	</dependency>
	```

- Jar
	
	[```https://github.com/OpenVidu/openvidu/tree/master/openvidu-java-client/target/openvidu-java-client.jar```](https://github.com/OpenVidu/openvidu/tree/master/openvidu-java-client/target/openvidu-java-client.jar)

The usage is quite simple: import OpenVidu package and get an **OpenVidu** object. You need to provide to the constructor the IP of your OpenVidu Server and the secret shared with it (initialized by `openvidu.secret=MY_SECRET` property). Then just call the following methods to get a shiny new sessionId or token to be returned to your frontend.


```java
import io.openvidu.java.client.OpenVidu;

OpenVidu openVidu = new OpenVidu(OPENVIDU_SERVER_IP, YOUR_SECRET);

Session session = this.openVidu.createSession();
String sessionId = session.getSessionId();
String token = session.generateToken();
// Send sessionId and token to frontend
```


## A sequence diagram to sum up



<p align="center">
  <img src="http://www.plantuml.com/plantuml/png/ZP9TIyCm58QlcrznY3SJNFsus8KNmgPJAcKPRWWYkyYQT8HXKfBiu-URkcn4cxhUji_xdFSSOjP2LbJJBnYf_PGo9kGARcyGSX-jA4H5fGNyeJOQdhMI5l_-eIekju9j-akjTePhZ11QgZtW7vXBXk623ygxiaH9gp4vetGQSD9Ofn4jrcsLN7ORDAhHKw6I3sA53hhaVz-fJhW4z1z21zp3PqvUiWcGwVXjEC_8P76EVoKEVy-UnWGUXtc-G6cQ7eSSe3hpjuvBNg-udN5ZX98PGqsYCGgR8uqx-INVpPKxNYUthSccDzpTBHjKkFAHo84QRy55NHdms_O2ooMAqCt1Fj1jb8VJGad92zlpHLj7nMxdizy0">
</p>

 1. Identify your user and listen to a request for joining a video call (represented by [LOGIN OPERATION] and [JOIN VIDEO CALL] in the diagram). This process is entirely up to you.
 2. You must get a _sessionId_: a new one if the video call is being created or an existing one for an active video call. In the first case you need to ask openvidu-server for it (as shown in the diagram), in the second case you must retrieve it from wherever you stored it when it was created (a data-base or maybe your backend itself).
 3. You also need a new valid _token_ for this session. Ask openvidu-server for it passing the _sessionId_.
 4. Finally return both parameters to your frontend, where using openvidu-browser you may initilize your session with _sessionId_ and then connect to it with _token_. Good news: **the code is exactly the same as explained before in [Code description](#code-description) section**

> Communication between _Your Back_ and _openvidu-server_ modules is outlined in the diagram, but it does not correspond to the real methods. Remember you can handle this from your backend by consuming the [REST API](#rest-api) or by using [openvidu-backend-client](#openvidu-backend-client) package.


## Running a secure videocall application
We have implemented a very basic [demo application](https://github.com/OpenVidu/openvidu-sample-secure) to see the secure version of OpenVidu in action. It has a Java backend to manage the user sessions and the securization process with OpenVidu Server.

 - Please be sure that you have docker-compose (`sudo apt-get install docker-compose`)
 - Download the `docker-compose.yml` file and run it:
   
   ```
   wget -O docker-compose.yml https://raw.githubusercontent.com/OpenVidu/openvidu-docker/master/openvidu-sample-secure/docker-compose.yml
   docker-compose up
   ```
 
 - Wait until you see an output like `Started App in XXX seconds (JVM running for XXX)`
 - Go to [`https://localhost:5000`](https://localhost:5000) and accept the self-signed certificate to enjoy your app (use a standard window and an incognito window to test a couple of users at the same time)
 


## Running a sample advanced app
Wanna try a [real sample application](https://github.com/OpenVidu/openvidu/tree/master/openvidu-sample-app) that makes use of everything we have talked about? Take a look at this app. It wraps a frontend built with Angular, a backend built with Spring and a MySQL database:

 - Please be sure that you have docker-compose (`sudo apt-get install docker-compose`)
 - Download the `docker-compose.yml` file and run it:
   
   ```
   wget -O docker-compose.yml https://raw.githubusercontent.com/OpenVidu/openvidu-docker/master/openvidu-sample-app/docker-compose.yml
   docker-compose up
   ```
 - Wait until you see an output like `Started App in XXX seconds (JVM running for XXX)`
   
 - Go to [`https://localhost:5000`](https://localhost:5000) and accept the self-signed certificate. Here you have a couple registered users (use a standard window and an incognito window to test both of them at the same time):

	| user                             | password |
	| -------------------------- | ----------- |
	| teacher@<span></span>gmail.com   | pass         |
	| student1@<span></span>gmail.com | pass         |

----------


Sharing data between users
===================
Whatever app you are developing, chances are you will need to pass some data for each user, at least a nickname. You can do it in two different places:

- **openvidu-browser**: when calling `session.connect` method
	```
	session.connect(token, DATA, function (error) { ... });
	```

- **API REST**: when asking for a token to */newToken*, you can pass data as third parameter in the BODY of the POST request 
	```
	{“0”: “sessionId”, “1”: “role”, “2”: "DATA"}
	```

	> **openvidu-backend-client** allows you to pass data when creating a Token object: </br>
	> `Token t = new TokenOptions.Builder().data("DATA").build();`

The result will be that in all clients *Connection* objects will have in their *data* property the pertinent value you have provided for each user. So, an easy way to get the data associated to any user would be:

```javascript
session.on('streamCreated', function (event) {
    session.subscribe(event.stream, 'subscriber');
    console.log('USER DATA: ' + event.stream.connection.data);
});
```

Some clarifications:

- *Connection.data* will be a simple string if you have provided data only with one of the methods, and will be a string with the following format if you provide data both from openvidu-browser and your backend: "OPENVIDUBROWSER_DATA%/%APIREST_DATA" 

- Using only first option is not secure, as clients could modify the value of the second parameter. It is intended only in development environments. If you want total control over shared data, please use the second way.
- You can choose whatever format you like for the data string, but if you are planning to share more than a simple field, maybe a standard format as JSON would be a wise choice.

----------

API reference
===================

> NOTE: all input parameters ("Parameters" columns) are listed in strict order, optional ones in _italics_

## openvidu-browser

| Class      | Description   										     |
| ---------- | ---------------------------------------------------------- |
| OpenVidu   | Use it to initialize your sessions and publishers |
| Session    | Represents a video call. It can also be seen as a room where multiple users can connect. Participants who publish their videos to a session will be seen by the rest of users connected to that specific session  |
| Publisher  | Packs local media streams. Users can publish it to a session |
| Subscriber | Packs remote media streams. Users automatically receive them when others publish their streams|
| Stream     | Represents each one of the videos send and receive by a user in a session. Therefore each Publisher and Subscriber has an attribute of type Stream |
| Connection     | Represents each one of the user's connection to the session (the local one and other user's connections). Therefore each Session and Stream object has an attribute of type Connection |

#### **OpenVidu**
| Method           | Returns | Parameters | Description |
| ---------------- | ------- | ------------------------------------------- | ----------- |
| `initSession`    | Session | _`apikey:string`_<br/>`sessionId:string` | Returns a session with id **sessionId** |
| `initPublisher`  | Publisher | `parentId:string`<br/>_`cameraOptions:any`_<br/>_`callback:function`_ | Starts local video stream, appending it to **parentId** HTML element, with the specific **cameraOptions** settings and executing **callback** function in the end. _cameraOptions_ must be an object with three properties: **{audio:boolean, video:boolean, quality:string}**, being _audio_/_video_ false if you want to initialize them muted (_Publisher.publishAudio(true)_ and _Publisher.publishVideo(true)_ can unmute them later) and _quality_ must be 'LOW', 'MEDIUM' or 'HIGH'|
| `checkSystemRequirements`  | Number |  | Returns 1 if the browser supports WebRTC, 0 otherwise|
| `getDevices` | Promise | `callback(error, deviceInfo):function` | Collects information about the media input and output devices available on the system, returned in **deviceInfo** array |

#### **Session**
| Method           | Returns | Parameters | Description |
| ---------------- | ------- | ------------------------------------------- | ----------- |
| `connect`    |  | `token:string`<br/>_`metadata:string`_<br/>`callback(error):function` | Connects to the session using **token** and executes **callback** in the end (_error_ parameter null if success). **metadata** parameter allows you to pass a string as extra data to share with other users when they receive _participantJoined_ event. You can also add metadata through openvidu-backend-client when generating tokens (see [TokenOptions](#tokenoptions)). The structure of this string is up to you (maybe some standarized format as JSON or XML is a good idea), the only restriction is a maximum length of 1000 chars |
| `disconnect`  |  | | Leaves the session, destroying all streams and deleting the user as a participant |
| `publish`  | | `publisher:Publisher` | Publishes the specific user's local stream contained in **publisher** object to the session |
| `unpublish` | | `publisher:Publisher` | Unpublishes the specific user's local stream contained in **publisher** object |
| `on` | | `eventName:string`<br/>`callback:function` | **callback** function will be triggered each time **eventName** event is recieved |
| `once` | | `eventName:string`<br/>`callback:function` | **callback** function will be triggered once when **eventName** event is recieved. The listener is removed immediately |
| `off` | | `eventName:string`<br/>`eventHandler:any` | Removes **eventHandler** handler for **eventName** event |
| `subscribe` | Subscriber | `stream:Stream`<br/>`htmlId:string`<br/>_`videoOptions:any`_ | Subscribes to **stream**, appending a new HTML Video element to DOM element of **htmlId** id, with **videoOptions** settings. This method is usually called in the callback of _streamCreated_ event |
| `unsubscribe` | | `subscriber:Subscriber` | Unsubscribes from **subscriber**, automatically removing its HTML Video element |

| Property    | Type   | Description                  |
| ------------| ------ | ---------------------------- |
| `sessionId` | string | The unique id of the session |


| Event                  | Properties            | Description                  |
| -----------------------| --------------------- | ---------------------------- |
| `streamCreated`        | stream:Stream         | Triggered by Session object when a new Stream has been created and added to it |
| `streamDestroyed`      | stream:Stream<br/>preventDefault():Function | Triggered by Session object when an existing Stream has been destroyed. The default behaviour is the deletion of the HTML video element associated to it. To prevent it, call `preventDefault()` method on the event object  |
| `connectionCreated`    | connection:Connection | Triggered by Session object whenever any user has joined the session. This includes dispatching one event for each user that joins the session when you are already connected to it, one for each existing participant the first time you connect to the session and once for your own local connection |
| `connectionDestroyed`  | connection:Connection | Triggered by Session object whenever a user leaves the session. This event can also mean that `streamDestroyed` events could be dispatched, depending on the streams associated to it  |
| `sessionDisconnected`  | preventDefault():Function | Triggered by Session object when the user disconnects from the Session. Default behaviour is the deletion of all HTML video elements. Call `preventDefault()` on event object to prevent it and delete them by yourself |

#### **Publisher**
| Method         | Returns | Parameters | Description |
| -------------- | ------- | ------------------------------------------- | ----------- |
| `publishAudio` |  | `value:boolean`| Enable or disable the audio track depending on whether value is _true_ or _false_ |
| `publishVideo` |  | `value:boolean`| Enable or disable the video track depending on whether value is _true_ or _false_ |
| `destroy`      | Publisher || Delets the publisher object and removes it from DOM. The rest of users will trigger a _streamDestroyed_ event |

| Property    | Type   | Description                  |
| ------------| ------ | ---------------------------- |
| `accessAllowed` | boolean | _true_ if the user has granted access to the camera, _false_ otherwise |
| `element` | Element | The parent HTML Element which contains the publisher |
| `id` | string | The id of the HTML Video element of the publisher |
| `stream` | Stream | The stream object of the publisher |
| `session` | Session | The session to which the publisher belongs |

| Event                  | Properties            | Description                  |
| -----------------------| --------------------- | ---------------------------- |
| `accessAllowed`        |          | Triggered by Publisher object when the user has granted access to the camera/microphone |
| `accessDenied`      |          | Triggered by Publisher object when the user has rejected access to the camera/microphone |
| `videoElementCreated`      | element:HTMLVideoElement | Triggered by Publisher object inmediately after a new video element has been added to DOM |

#### **Subscriber**
| Method         | Returns | Parameters | Description |
| -------------- | ------- | ------------------------------------------- | ----------- |
| | | | |


| Property    | Type   | Description                  |
| ------------| ------ | ---------------------------- |
| `element` | Element | The parent HTML Element which contains the subscriber |
| `id` | string | The id of the HTML Video element of the subscriber |
| `stream` | Stream | The stream object of the subscriber |

| Event                  | Properties            | Description                  |
| -----------------------| --------------------- | ---------------------------- |
| `videoElementCreated`      | element:HTMLVideoElement | Triggered by Subscriber object inmediately after a new video element has been added to DOM |

#### **Connection**
| Property    | Type   | Description                  |
| ------------| ------ | ---------------------------- |
| `connectionId` | string | Unique identifier of the connection |
| `data` | string | Data associated to this connection (and therefore to certain user). This is an important field: it allows you to broadcast all the information you want for each user (a username, for example)  |
| `creationTime` | number | Time when this connection was created |

## openvidu-backend-client

| Class        | Description   										     |
| ------------ | ------------------------------------------------------- |
| OpenVidu     | Use it to create all the sessions you need |
| Session      | Allows for the creation of tokens |
| OpenViduRole | Enum that defines the values accepted by _TokenOptions.Builder.role(OpenViduRole role)_ method |
| TokenOptions | Customize each token with this class when generating them |

#### **OpenVidu**
| Method         | Returns | Parameters | Description |
| -------------- | ------- | --------------------------------------------- | ----------- |
| OpenVidu() | | `String:urlOpenViduServer`<br>`String:secret` | The constructor receives the URL of your OpenVidu Server and the secret shared with it |
| createSession() | Session |  | Get a Session object by calling this method. You can then store it as you want |

#### **Session**
| Method         | Returns | Parameters  | Description |
| -------------- | ------- | --------------------------------------------- | ----------- |
| getSessionId() | String |  | Returns the unique identifier of the session. You will need to return this parameter to the client side to pass it during the connection process to the session |
| generateToken() | String | _`TokenOptions:tokenOptions`_  | The value returned is required in the client side just as the sessionId in order to connect to a session |

#### **OpenViduRole**
| Enum       | Description |
| ---------- | ------- |
| SUBSCRIBER | They can subscribe to published streams of other users |
| PUBLISHER  | They can subscribe to published streams of other users and publish their own streams|
| MODERATOR  | They can subscribe to published streams of other users, publish their own streams and force _unpublish()_ and _disconnect()_ over a third-party stream or user |

#### **TokenOptions**
| Method         | Returns | Parameters | Description |
| -------------- | ------- | -------------------------------------------| -- |
| getData() | String |        | Returns the metadata associated to the token |
| getRole() | OpenViduRole |  | Returns the role associated to the token     |

##### **TokenOptions.Builder** _(inner static class)_
| Method         | Returns | Parameters | Description |
| -------------- | ------- | --------------------------------------------- | ----------- |
| TokenOptions.Builder() |  |  | Constructor |
| build() | TokenOptions |  | Returns a new **TokenOptions** object with the stablished properties. Default values if methods _data()_ and _role()_ are not called are an empty string and OpenViduRole.PUBLISHER, respectively |
| data() | TokenOptions.Builder | `String:data` | Some extra metadata to be associated to the user through its token. The structure of this string is up to you (maybe some standarized format as JSON or XML is a good idea), the only restriction is a maximum length of 1000 chars |
| role() | TokenOptions.Builder | `OpenViduRole:role` | The role associated to this token |


----------


Deploying on AWS
===================
Here you have a step by step guide to deploy a production version of OpenVidu in an Ubuntu machine. In this case, KMS and openvidu-server run in the same machine, the first one as a native service and the second one in a Docker container.

1. Install KMS (in first command: ***xenial*** for 16.04, ***trusty*** for 14.04)
	```bash
	echo "deb http://ubuntu.kurento.org xenial kms6" | sudo tee /etc/apt/sources.list.d/kurento.list
	wget -O - http://ubuntu.kurento.org/kurento.gpg.key | sudo apt-key add -
	sudo apt-get update
	sudo apt-get install kurento-media-server-6.0
	```

2. Install COTURN
	```
	sudo apt-get install coturn
	```

3. File `/etc/kurento/modules/kurento/WebRtcEndpoint.conf.ini`
	```
	stunServerAddress=STUN_IP
	stunServerPort=STUN_PORT
	turnURL=USER:PASS@YOUR_MACHINES'S_PUBLIC_IP:3478
	```

4. File `/etc/turnserver.conf`
	```
	external-ip=YOUR_MACHINES'S_PUBLIC_IP
	fingerprint
	user=USER:PASS
	lt-cred-mech
	realm=kurento.org
	log-file=/var/log/turnserver/turnserver.log
	simple-log
	```

5. File `/etc/default/coturn`
	```
	TURNSERVER_ENABLED=1
	```

6. Init services
	```bash
	sudo service coturn restart
	sudo service kurento-media-server-6.0 restart
	```

7. Init openvidu-server Docker container (securization enabled)
	
	```
	sudo docker run -d -p 8443:8443 -e openvidu.security=true -e openvidu.secret=YOUR_SECRET -e kms.uris=[\"ws://YOUR_MACHINE'S_INTERNAL_IP:8888/kurento\"] openvidu/openvidu-server
	```


----------

Developing OpenVidu
===================

Packages required:

```sudo apt-get update```

| Dependecy     | Check version | Install                            |
| ------------- | ------------- |----------------------------------- |
| node          | `nodejs -v`   | `sudo apt-get install -g nodejs`   |
| npm           | `npm -v`      | `sudo apt-get install -g npm`      |
| maven         | `mvn -v`      | `sudo apt-get install -g maven`    |
| angular-cli   | `ng -v`       | `sudo npm install -g @angular/cli` |
| typescript    | `tsc -v`      | `sudo npm install -g typescript`   |


OpenVidu with KMS
------------------

How to *install* and *run* KMS in your development machine:

Ubuntu 14.04 LTS Trusty (64 bits)
```
echo "deb http://ubuntu.kurento.org trusty kms6" | sudo tee /etc/apt/sources.list.d/kurento.list
wget -O - http://ubuntu.kurento.org/kurento.gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install kurento-media-server-6.0
```

Ubuntu 16.04 LTS Xenial (64 bits)
```
echo "deb http://ubuntu.kurento.org xenial kms6" | sudo tee /etc/apt/sources.list.d/kurento.list
wget -O - http://ubuntu.kurento.org/kurento.gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install kurento-media-server-6.0
```

Start and stop the service
```
sudo service kurento-media-server-6.0 start
sudo service kurento-media-server-6.0 stop
```

[Here](http://doc-kurento.readthedocs.io/en/stable/installation_guide.html) you can check Kurento's official documentation.

Setup for development
------------------

Here we show how to develop an Angular app with OpenVidu having all packages linked in your local machine, so you can modify them and check the final result. After installing Kurento Media Server and forking or downloading the repo, these are the necessary steps to start developing **openvidu-ng-testapp**:

```
sudo service kurento-media-server-6.0 start
```
**/openvidu/openvidu-browser/src/main/resources**
```
npm install
sudo npm link
```
**/openvidu/openvidu-ng-testapp**
```
npm install
npm link openvidu-browser
ng serve
```
**/openvidu**
```
mvn compile -DskipTests=true
mvn install -DskipTests=true
```
**/openvidu/openvidu-server**
```
mvn clean compile package exec:java
```

*(or if you prefer you can just run the Java application in your favourite IDE)*


----------


At these point, you can start modifying *openvidu-ng-testapp*, *openvidu-browser* or *openvidu-server*.

 - *openvidu-ng-testapp*:  the previous "ng serve" command will take care of refreshing the browser's page whenever any change takes place.
 - *openvidu-browser*: after modifying any typescript file, you will need to run the following command to update your changes (*typescript* package is necessary):
 
 **/openvidu/openvidu-browser/src/main/resources** 
 ``` 
 npm run updatetsc
  ```
 - *openvidu-server*: after modifying any file, there is no other alternative but to re-launch the java application if you want to update your changes.

 **/openvidu/openvidu-server** 
 ``` 
 mvn clean compile package exec:java
  ```
*(or re-launch the Java application in your IDE. Some IDE's support automatic re-launch in response to changes)*


Setup for advanced development (publishing in local server)
------------------
You can also use different machines in the same network to build a more advanced development environment, so you can test the application in different devices at the same time. It's very similar to the process outlined above:

You will need a server for the built app (if you don't have any, we recommend *http-server*):
```npm install -g http-server```

Then...

```
sudo service kurento-media-server-6.0 start
```
**/openvidu/openvidu-browser/src/main/resources**
```
npm install
sudo npm link
```
**/openvidu/openvidu-ng-testapp**
```
npm install
npm link openvidu-browser
```
**/openvidu**
```
mvn compile -DskipTests=true
mvn install -DskipTests=true
```
**/openvidu/openvidu-server**
```
mvn clean compile package exec:java
```
*(or if you prefer you can just run the Java application in your favourite IDE)*


The following commands will be the ones which you should relaunch to update your changes:
**/openvidu/openvidu-ng-testapp**

```
ng build
cd dist
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem  [ACCEPT ALL FIELDS]
http-server -S
```

These commands build the Angular project, generate a self-signed certificate (which unfortunately is a mandatory requirement for http-server SSL) and serves the content in http-server.

Finally, to launch the app connect to *https://127.0.0.1:8080* in the machine running the http-server and to *https://[HOST]:8080* in other devices of the same network ([HOST] the IP of the machine running the http-server).

Don't forget to accept the certificate at *https://[HOST]:8443* !

----------


Acknowledgments
===============
OpenVidu platform has been supported under project LERNIM (RTC-2016-4674-7) confunded by the _Ministry of Economy, Finance and Competitiveness_ of Spain, as well as by the _European Union_ FEDER, whose main goal with this funds is to promote technological development, innovation and high-quality research.

<p align="center">
  <img width="400px" src="https://docs.google.com/uc?id=0B61cQ4sbhmWSQzNLQnF4SnhFLWc">
</p>

<p align="center">
  <img width="400px" src="https://docs.google.com/uc?id=0B61cQ4sbhmWSa205YXNkSW9VNUE">
</p>



