# openvidu-node-client
NPM package that wraps the HTTP REST operations of openvidu-server.

- NPM installation

	```
	npm install openvidu-node-client
	```

The usage is quite simple: import OpenVidu dependencies and get an **OpenVidu** object. You need to provide to the constructor the IP of your OpenVidu Server and the secret shared with it (initialized by `openvidu.secret` property on launch). Then just call the following methods to get a shiny new sessionId or token to be returned to your frontend.

```javascript
var OpenVidu = require('openvidu-node-client').OpenVidu;
var Session  = require('openvidu-node-client').Session;

var openVidu = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

var session = openVidu.createSession();
session.getSessionId( function (sessionId) {
    session.generateToken( function (token) {

        // Send sessionId and token back to your client

    });
});
```

To customize your tokens you can use [TokenOptions](#tokenoptions) class. Initialize it with its _Builder_ inner class:

```javascript
var tokenOptions = new TokenOptions.Builder()
	.data('serverData')
	.role(OpenViduRole.SUBSCRIBER)
	.build();
	
session.generateToken(tokenOptions, function (token) {

	// Send sessionId and token back to your client

});
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
| getSessionId() | | `callback(sessionId:string):Function` | The callback receives as parameter the unique identifier of the Session. You will need to return this parameter to the client side to pass it during the connection process to the session |
| generateToken() | | _`TokenOptions:tokenOptions`_<br>`callback(token:string):Function`  | The callback receives as parameter the new created token. The value returned is required in the client side just as the sessionId in order to connect to a session |

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

##### **TokenOptions.Builder** _(inner class)_
| Method         | Returns | Parameters | Description |
| -------------- | ------- | --------------------------------------------- | ----------- |
| TokenOptions.Builder() |  |  | Constructor |
| build() | TokenOptions |  | Returns a new **TokenOptions** object with the stablished properties. Default values if methods _data()_ and _role()_ are not called are an empty string and OpenViduRole.PUBLISHER, respectively |
| data() | TokenOptions.Builder | `String:data` | Some extra metadata to be associated to the user through its token. The structure of this string is up to you (maybe some standarized format as JSON or XML is a good idea), the only restriction is a maximum length of 1000 chars |
| role() | TokenOptions.Builder | `OpenViduRole:role` | The role associated to this token |