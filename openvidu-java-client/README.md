# openvidu-java-client
Java package that wraps the HTTP REST operations of openvidu-server.

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

The usage is quite simple: import OpenVidu package and get an **OpenVidu** object. You need to provide to the constructor the IP of your OpenVidu Server and the secret shared with it (initialized by `openvidu.secret` property on launch). Then just call the following methods to get a shiny new sessionId or token to be returned to your frontend.


```java
import io.openvidu.java.client.OpenVidu;

OpenVidu openVidu = new OpenVidu(OPENVIDU_SERVER_IP, YOUR_SECRET);

Session session = this.openVidu.createSession();
String sessionId = session.getSessionId();
String token = session.generateToken();

// Send sessionId and token to your client
```

To customize your tokens you can use [TokenOptions](#tokenoptions) class. Initialize it with its _Builder_ inner class:

```javascript
TokenOptions tokenOptions = new TokenOptions.Builder()
	.data("serverData")
	.role(OpenViduRole.SUBSCRIBER)
	.build();
	
String token = session.generateToken(tokenOptions);
```

## API Reference

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