# OpenVidu Test Load

This repository aims to facilitate the definition, execution and review of massive load testing scenarios of an OpenVidu application in a distributed cluster of containerized browsers, located in Amazon Web Services Cloud.

Number of total sessions and participants must be customizable. Test will have the following default conditions:

- Every participant will be connecting from a single browser. Eveyr browser will be launched in its own Docker container with fixed resource configuration (available RAM, number of cores and bandwidth)
- Every browser will be a Chrome instance launched with the following options: `allow-file-access-from-files`, `use-file-for-fake-video-capture=fakevideo.y4m`, `use-file-for-fake-audio-capture=fakeaudio.wav`, `window-size=1980,1280`
- OpenVidu will be deployed in a dedicated EC2 machine. Every OpenVidu session (and therefore every dockerized browser) will be connecting to this same instance
- Each session will have 7 participants (7 publishers and 42 subscribers)
- Each video will have a resolution of 540×360 pixels, 30 fps
- The sessionId will be acquired from the URL
- Any kind of complexity in the client code will be avoided: just HTML videos displaying the local and remote streams
- Every RTCPeerConnection object will be exposed to gather statistics thanks to method getStats()
- The following statistics will be the ones gathered for each RTCPeerConnection object: Sender Round-Trip-Time (googRtt), Receviers Round-Trip-Time (googRtt), Received Bit-Rate, Sent Bit-Rate, Packet loss
- Every browser will be monitored to ensure each one of the 7 videos is playing media
