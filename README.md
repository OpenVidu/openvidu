[![][KurentoImage]][Kurento]

Copyright © 2013-2016 [Kurento]. Licensed under [LGPL v2.1 License].

kurento-room
============

Kurento Room is composed by several modules to offer group communications by
means of WebRTC. These modules are:

  * `kurento-room-sdk` - module that provides a management interface for 
    developers of multimedia conferences (rooms) applications in Java 
  * `kurento-room-server` - Kurento’s own implementation of a room API, it 
    provides the WebSockets API for the communications between room clients and 
    the server.
  * `kurento-room-client` - Java library that uses WebSockets and JSON-RPC to 
    interact with the server-side of the Room API. Can be used to implement the 
    client-side of a room application.
  * `kurento-room-client-js` - Javascript library that acts as wrapper for several 
    JS APIs (WebRTC, WebSockets, Kurento Utils). Can be used to implement the 
    client-side of a room application.
  * `kurento-room-demo` - demonstration project, contains the client-side 
    implementation (HTML, Javascript, graphic resources) and embeds the room 
    server to provide the functionality required for group communications
  * `kurento-room-test` - integration and functionality tests for the basic room 
    server application
  * `kurento-room-demo-test` - integration and functionality tests for the demo 
    application.

There is extensive documentation on each of these components together with a
tutorial based on the Room demo. This documentation can be easily generated in 
HTML format from the [kurento-room-doc](./kurento-room-doc/README.md) project.

Dependencies
------------

These are some of the design and architecture requirements that an application 
has to fulfill in order to integrate the Room API:

  * include the SDK module to its dependencies list
  * create one of the two `RoomManager` types as a singleton instance by 
    providing implementations for the following interfaces: 
    * `RoomEventHandler`
    * `KurentoClientProvider`
  * develop the client-side of the application for devices that support WebRTC
    (*hint:* or use our *client-js* library and take a look at the demo's client 
    implementation)
  * design a room signaling protocol that will be used between the clients and
    the server (*hint:* or use the WebSockets API from `kurento-room-server`) 
  * implement a handler for clients' requests on the server-side, that will
    use the `RoomManager` to process these requests (*hint:* JSON-RPC handler
    from `kurento-room-server`)
  * choose a response and notification mechanism for the communication with the
    clients (*hint:* JSON-RPC notification service from `kurento-room-server`)

About the technology stacks that can or should be used to implement a Rooms 
application: 

  * WebSockets for the communications between the server and the clients
  * Spring and Spring Boot for the easy configuration and integration with some 
    of Kurento's modules. It also provides a WebSockets library.

And of course, the main requirement is at least one installation of the Kurento
Media Server, accessible to the room application.

Running the demo
----------------

For a quick initial contact with the framework, we recommend running the demo
application and observing the exchange of Websocket messages between the clients
and the server. 

Currently, the demo is only supported for Ubuntu 14.04 LTS 64bits.

After cloning the tutorial, it can be executed directly from the terminal by 
using Maven's `exec` plugin. To make sure the demo's 
build and execution works smoothly, a stable release (or tag) is checked out 
before proceeding with the build (prevents missing dependencies, given that in 
Kurento *master* is the development branch):

```
$ git clone git@github.com:Kurento/kurento-room.git
$ cd kurento-room
$ git checkout 6.1.0
$ cd kurento-room-demo
$ mvn compile exec:java
```

Now open the following URL in a WebRTC-compatible browser and connect to a new
room by providing the desired user and room names:

```
http://localhost:8080   
```

Configuring the demo
--------------------

There are a couple of interesting options or properties that might have to be
modified for the demo to function properly.

The properties file, **kroomdemo.conf.json**, used in the demo's execution as 
described above, is located in the folder `src/main/resources` and its 
contents are the following:

    {
       "kms": {
          "uris": ["ws://localhost:8888/kurento","ws://127.0.0.1:8888/kurento"]
       },
       "app": {
          "uri": "http://localhost:8080/"
       },
       "kurento": {
          "client": {
             //milliseconds
             "requestTimeout": 20000
          }
       },
       "demo": {
          //mario-wings.png or wizard.png
          "hatUrl": "mario-wings.png"
          "hatCoords": {
             // mario-wings hat
             "offsetXPercent": -0.35F,
             "offsetYPercent": -1.2F,
             "widthPercent": 1.6F,
             "heightPercent": 1.6F

             //wizard hat
             //"offsetXPercent": -0.2F,
             //"offsetYPercent": -1.35F,
             //"widthPercent": 1.5F,
             //"heightPercent": 1.5F
          },
          "loopback" : {
             "remote": false,
             //matters only when remote is true
             "andLocal": false
          },
          "authRegex": ".*",
          "kmsLimit": 10
       }
    } 

These properties can be overwritten on the command-line when starting 
the demo server:

```
$ mvn compile exec:java -Dkms.uris=[\"ws://192.168.1.99:9001/kurento\"]
```

In this example, we've instructed the demo to use a different URI of a running 
KMS instance when creating the `KurentoClient` required by the Room API.

More details on the demo's configuration and execution can be found in the demo's 
[README page](./kurento-room-demo/README.md) or in the Room API 
[documentation](./kurento-room-doc/README.md) .

What is Kurento
---------------

Kurento is an open source software project providing a platform suitable 
for creating modular applications with advanced real-time communication
capabilities. For knowing more about Kurento, please visit the Kurento
project website: http://www.kurento.org.

Kurento is part of [FIWARE]. For further information on the relationship of 
FIWARE and Kurento check the [Kurento FIWARE Catalog Entry]

Kurento is part of the [NUBOMEDIA] research initiative.

Documentation
-------------

The Kurento project provides detailed [documentation] including tutorials,
installation and development guides. A simplified version of the documentation
can be found on [readthedocs.org]. The [Open API specification] a.k.a. Kurento
Protocol is also available on [apiary.io].

Source
------

Code for other Kurento projects can be found in the [GitHub Kurento Group].

News and Website
----------------

Check the [Kurento blog]
Follow us on Twitter @[kurentoms].

Issue tracker
-------------

Issues and bug reports should be posted to the [GitHub Kurento bugtracker]

Licensing and distribution
--------------------------

Software associated to Kurento is provided as open source under GNU Library or
"Lesser" General Public License, version 2.1 (LGPL-2.1). Please check the
specific terms and conditions linked to this open source license at
http://opensource.org/licenses/LGPL-2.1. Please note that software derived as a
result of modifying the source code of Kurento software in order to fix a bug
or incorporate enhancements is considered a derivative work of the product.
Software that merely uses or aggregates (i.e. links to) an otherwise unmodified
version of existing software is not considered a derivative work.

Contribution policy
-------------------

You can contribute to the Kurento community through bug-reports, bug-fixes, new
code or new documentation. For contributing to the Kurento community, drop a
post to the [Kurento Public Mailing List] providing full information about your
contribution and its value. In your contributions, you must comply with the
following guidelines

* You must specify the specific contents of your contribution either through a
  detailed bug description, through a pull-request or through a patch.
* You must specify the licensing restrictions of the code you contribute.
* For newly created code to be incorporated in the Kurento code-base, you must
  accept Kurento to own the code copyright, so that its open source nature is
  guaranteed.
* You must justify appropriately the need and value of your contribution. The
  Kurento project has no obligations in relation to accepting contributions
  from third parties.
* The Kurento project leaders have the right of asking for further
  explanations, tests or validations of any code contributed to the community
  before it being incorporated into the Kurento code-base. You must be ready to
  addressing all these kind of concerns before having your code approved.

Support
-------

The Kurento project provides community support through the  [Kurento Public
Mailing List] and through [StackOverflow] using the tags *kurento* and
*fiware-kurento*.

Before asking for support, please read first the [Kurento Netiquette Guidelines]

[documentation]: http://www.kurento.org/documentation
[FIWARE]: http://www.fiware.org
[GitHub Kurento bugtracker]: https://github.com/Kurento/bugtracker/issues
[GitHub Kurento Group]: https://github.com/kurento
[kurentoms]: http://twitter.com/kurentoms
[Kurento]: http://kurento.org
[Kurento Blog]: http://www.kurento.org/blog
[Kurento FIWARE Catalog Entry]: http://catalogue.fiware.org/enablers/stream-oriented-kurento
[Kurento Netiquette Guidelines]: http://www.kurento.org/blog/kurento-netiquette-guidelines
[Kurento Public Mailing list]: https://groups.google.com/forum/#!forum/kurento
[KurentoImage]: https://secure.gravatar.com/avatar/21a2a12c56b2a91c8918d5779f1778bf?s=120
[LGPL v2.1 License]: http://www.gnu.org/licenses/lgpl-2.1.html
[NUBOMEDIA]: http://www.nubomedia.eu
[StackOverflow]: http://stackoverflow.com/search?q=kurento
[Read-the-docs]: http://read-the-docs.readthedocs.org/
[readthedocs.org]: http://kurento.readthedocs.org/
[Open API specification]: http://kurento.github.io/doc-kurento/
[apiary.io]: http://docs.streamoriented.apiary.io/
