What is OpenVidu?
========

OpenVidu is a platform to facilitate the addition of video calls in your web or mobile 
application, either group or one-to-one calls. In fact, any combination you come up with is easy to implement with OpenVidu.

It is based on [Kurento](http://www.kurento.org), the WebRTC platform for multimedia applications.

OpenVidu and Kurento are licensed under Apache License v2.

OpenVidu was forked from [KurentoRoom project](https://github.com/Kurento/kurento-room).


----------


Running a sample app
===================


## Basic plain JavaScript app

 - Run the docker container. It wraps **openvidu-server** (initialize in non-secure mode), **KMS** and a **web page** being served in port 8080
   
   ```
   docker run -p 8080:8080 -p 8443:8443 -e KMS_STUN_IP=193.147.51.12 -e KMS_STUN_PORT=3478 -e openvidu.security=false openvidu/openvidu-plainjs-demo
   ```
   
 - Accept certificate at `https://localhost:8443` / `https://127.0.0.1:8443` if necessary and go to `localhost:8080`

There you have the app!

----------


Integrating OpenVidu in your project
===================
First of all, let's make clear how OpenVidu works. You have a secure version and a non-secure version available.

## Non-secure OpenVidu

![Unsecured](https://docs.google.com/uc?id=0B61cQ4sbhmWSNF9ZWHREUXo3QlE)

In the image above you can see the three modules that make up OpenVidu in its simplest form.

- **openvidu-browser**: JavaScript / TypeScript library to be used in your frontend. You can manage your video calls, rooms and participants with its API.
- **openvidu-server**: Java application to handle all operations over Kurento Media Server
- **Kurento Media Server**: a media server which finally handles the processing and transmission of media streams

The good news for developers are that a fully functional version of **openvidu-server** and **Kurento Media Server** are provided, waiting to be downloaded and run. So the only effort you have to make is adding **openvidu-browser** in your frontend app and calling the necessary methods exposed by the API.


## Secure OpenVidu
![Secured](https://docs.google.com/uc?id=0B61cQ4sbhmWSeDNIekd5R2ZhQUE)

Probably you don't want unauthorized users swamping your video calls. To achieve this, a little further work is requiered.

The image above shows the main difference with the non-secure version: the presence of a backend application. This is quite obvious, since you cannot have a safe and secure app if you cannot identify your users.
The important thing here is the new module **openvidu-backend-client**, a Java package to make easy the process of authorizing users.

OpenVidu securization is based on **tokens**: only users with a valid token can connect to a certain video call. This process is deeply simplified by using openvidu-browser and openvidu-backend-client in conjuction. 
Essentially, these are the steps you will need to follow:

1. **Identify your user** (and probably his role for a particular video call).
2. Use openvidu-backend-client to generate a new valid **token** for that video call. If you are creating the video call (and not letting a user join an existing one), you will first need to generate an **identifier** for the new video call. openvidu-backend-client actually wraps the secure communication process between your backend application and openvidu-server, which is ultimately responsible for generating, storing and deleting all your identifiers and tokens.
3. **Return the identifier and token** to your frontend.
4. Use openvidu-browser to **connect the user to the video call**, passing the identifier and the token as parameters.

## How do I include OpenVidu in my app?

### Backend ###
As explained in the sections above, OpenVidu requires having up and running **Kurento Media Server** and **openvidu-server**. You can make your own decision at this particular point attending to your needs and resources: run openvidu-server and Kurento Media Server in different machines, run both of them in the same machine or use the docker image provided to make it even simplier. Furthermore, if your application has a backend on its own, you could even run it in the same machine. 

This is all up to you and your resources. 
We recommend testing different scenarios to find the best approach for your particular needs. Have in mind that the Docker image will always be the easiest way to get everything working.

### Client: Non-secure OpenVidu ###

For plain JavaScript, include this file ([OpenVidu.js](https://github.com/OpenVidu/openvidu/blob/master/openvidu-browser/src/main/resources/static/js/OpenVidu.js)) in your frontend app.
We recommend trying [this sample app](#basic-plain-javascript-app).

For npm projects, you have an [openvidu-browser](https://www.npmjs.com/package/openvidu-browser) package ready to be added to your _package.json_.
We recommend trying [this sample Angular app](#basic-angular-app).

#### ***Step by step*** ####

1. Get an *OpenVidu* object and initialize a session with a *sessionId*. Remember that this is the parameter that defines which video call to connect.

	```javascript
	var OV = new OpenVidu("wss://" + OPENVIDU_SERVER_IP + ":8443/");
    var session = OV.initSession(sessionId);
    ```
2. Set the events to be listened by your session. For example, this snippet below will automatically append the new participants videos to HTML element with 'subscriber' id. Available events are detailed in [API section](#api-reference).

	```javascript
	session.on('streamCreated', function (event) {
		session.subscribe(event.stream, 'subscriber', {
			insertMode: 'append',
			width: '100%',
			height: '100%'
		});
	});
    ```
3. Connect to the session. For a non-secure approach, the value of *token* parameter is irrelevant. You can pass as second parameter a callback to be executed after connection is stablished. A common use-case for users that want to stream their own video is the following one: if the connection to the session has been succesful, get a Publisher object (appended to HTML element with id 'publisher') and publish it. The rest of participants will receive the stream.

	```javascript
	session.connect(token, function (error) {
		// If connection successful, get a publisher and publish to the session
		if (!error) {
			
			var publisher = OV.initPublisher('publisher', {
				insertMode: 'append',
				width: '100%',
				height: '100%'
			});
			
			session.publish(publisher);

		} else {
			console.log('Error while connecting to the session');
		}
	});
    ```


### Client: Secure OpenVidu ###
Your fronted will have to include plain JavaScript or openvidu-browser dependency just as in the non-secure architecture. 
And here is the good part: there's really no difference between a secure and a non-secure client. You just need to get a valid **sessionId** and a valid **token** from your backend to pass as parameters in `OpenVidu.initSession(sessionId)` and `Session.connect(token, callback)` methods. And it is here where _openvidu-backend-client_ comes into play.

Your backend will need _openvidu-backend-client_ dependency. Easy maven integration is provided by the following dependency:

```xml
<dependency>
    <groupId>org.openvidu</groupId>
    <artifactId>openvidu-backend-client</artifactId>
    <version>...</version>
</dependency>
```

[Here](https://github.com/OpenVidu/openvidu/tree/master/openvidu-backend-client/src/main/java/org/openvidu/client) you have the source code of openvidu-backend-client. Please note that [this](https://github.com/OpenVidu/openvidu/blob/76a7531a69eec884666fe70a2eedd0c82395a081/openvidu-backend-client/src/main/java/org/openvidu/client/OpenVidu.java#L47-L58) snippet is a fix to avoid SSL problems caused by the use of a self-signed certificate.

We recommend trying [this sample app](#advanced-secure-app).

#### ***Step by step*** ####

1. Import OpenVidu package and get an **OpenVidu** object. You need to provide to the constructor the IP of your OpenVidu Server and the secret shared with it (initialized by `openvidu.secret=MY_SECRET` property, as you can see [here](#advanced-secure-app) in the snippet which starts Docker container).

	```java
	import org.openvidu.client.OpenVidu;
	...
	
	OpenVidu openVidu = new OpenVidu(OPENVIDU_SERVER_IP, YOUR_SECRET);
    ```
2. Get all the **sessionId** and **tokens** you need by calling the following methods. This process is up to you. As the developer of your app, you will have to decide when and how to return to clients these parameters, as well as the way they should be stored, reused and finally deleted. 
In [this class](https://github.com/OpenVidu/openvidu/blob/master/openvidu-sample-app/src/main/java/openvidu/openvidu_sample_app/session_manager/SessionController.java) of the secure sample app you have a way of dealing with it by using some concurrent maps and some REST controllers, but you can handle it as you wish.

	```java
	Session session = openVidu.createSession();
	String sessionId = session.getSessionId();
	String token = session.generateToken(OpenViduRole.PUSBLISHER);
	```


#### ***REST API*** ####
You can always directly implement the REST API wrapped by artifact openvidu-backend-client. Two operations are available, matching the two methods exposed by openvidu-backend-client: one for getting a new **sessionId** and other to create and receive a new **token** for a certain session and role.

Both of them have in common the header referred to authorization. It is implemented via Basic Auth, and it is as simple as applying Base64 encoding to the username (always "OPENVIDUAPP") and the password (your secret). An example is shown below:

For secret "MY_SECRET", the final header would be

> Authorization:Basic T1BFTlZJRFVBUFA6TVlfU0VDUkVU


| _GET A SESSION ID_ | _PARAMETERS_ |
| ---------       | -- |
| **Operation** | GET |
| **URL** | https://[YOUR_OPENVIDUSERVER_IP]/getSessionId |
| **Headers** | Authorization:Basic _EncodeBase64(OPENVIDUAPP:[YOUR_SECRET])_ |
| **Returns** | {"0": "SESSIONID"} |

| _CREATE NEW TOKEN_ | _PARAMETERS_ |
| ---------       | -- |
| **Operation** | POST |
| **URL** | https://[YOUR_OPENVIDUSERVER_IP]/newToken |
| **Headers** | Authorization:Basic _EncodeBase64(OPENVIDUAPP:[YOUR_SECRET])_<br/>Content-Type:application/json |
| **Body** | {"0": "SESSIONID", "1": "ROLE", "2": "METADATA"} |
| **Returns** | {"0": "TOKEN"} |


> **ROLE** value in Body field of POST to "/newToken" can be:
> 
> - SUBSCRIBER
> - PUBLISHER
> - MODERATOR



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
| Stream     | Represents each of the videos send and receive by a user in a session. Therefore each Publisher and Subscriber has an attribute of type Stream |

#### **OpenVidu**
| Method           | Returns | Parameters | Description |
| ---------------- | ------- | ------------------------------------------- | ----------- |
| `initSession`    | Session | _`apikey:string`_<br/>`sessionId:string` | Returns a session with id **sessionId** |
| `initPublisher`  | Publisher | `parentId:string`<br/>`cameraOptions:any`<br/>_`callback:function`_ | Starts local video stream, appending it to **parentId** HTML element, with the specific **cameraOptions** settings and executing **callback** function in the end |
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

#### **Subscriber**
| Method         | Returns | Parameters | Description |
| -------------- | ------- | ------------------------------------------- | ----------- |
| | | | |


| Property    | Type   | Description                  |
| ------------| ------ | ---------------------------- |
| `element` | Element | The parent HTML Element which contains the subscriber |
| `id` | string | The id of the HTML Video element of the subscriber |
| `stream` | Stream | The stream object of the subscriber |

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
Coming soon ...

----------


Developing OpenVidu
===================

First of all, you will need these packages:

```sudo apt-get update```

| Dependecy     | Check version | Install                            |
| ------------- | ------------- |----------------------------------- |
| node          | `nodejs -v`   | `sudo apt-get install -g nodejs`   |
| npm           | `npm -v`      | `sudo apt-get install -g npm`      |
| maven         | `mvn -v`      | `sudo apt-get install -g maven`    |
| angular-cli   | `ng -v`       | `sudo npm install -g @angular/cli` |
| typescript    | `tsc -v`      | `sudo npm install -g typescript`   |


OpenVidu structure
------------------

OpenVidu is composed by several modules which require some interconnections in order to have an easy and effortless development.

Here's a simple summary about the structure of OpenVidu:

![OpenVidu structure](https://drive.google.com/uc?export=view&id=0B61cQ4sbhmWSQ1AwaXlnRTR4djA)


- **Kurento Media Server**: External module which provides the low-level functionalities related to the media transmission. 
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

- [**openvidu-browser**](https://github.com/pabloFuente/openvidu/tree/master/openvidu-browser): Javascript library used to connect the application with openvidu-server
- [**kurento-utils-js**](https://github.com/pabloFuente/openvidu/tree/master/kurento-utils-js): Javascript set of reusable components that have been found useful during the development of WebRTC applications with Kurento
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
sudo npm link
```
**/openvidu/openvidu-ng-testapp**
```
npm install
sudo npm link openvidu-browser
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
sudo npm link openvidu-browser
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

Don't forget to accept the certificate! (accepting *https://[HOST]:8443/room* may also be necessary)