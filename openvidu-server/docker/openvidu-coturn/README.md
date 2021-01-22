# Coturn OpenVidu

This is a docker image to launch a coturn server. Environment variables can be defined to modify the files `/etc/default/coturn` and `cat>/etc/turnserver.conf`.

## Environment variables

### Turn configuration
- TURN_PUBLIC_IP: Public ip where coturn will be placed. If this environment variable is not setted, it will get the ip returned by `curl ifconfig.co`.
- TURN_LISTEN_PORT: Port where turn will be listening.

### Turn credentials
- REDIS_IP: Redis where credentials are stored
- DB_NAME: Name of the database in redis
- DB_PASSWORD: Password of the redis database

# Execution example

Actual version of OpenVidu need to be located in the same node because tokens sends the url for turn/stun connections with the host url.

## Execute turn locally next to the redis database

You need to have a redis database running:

```
docker run --rm --name some-redis -d -p 6379:6379 redis
```

Get the ip of the container and after that, run coturn, you can use url as ip too, in this example I am running coturn with nip.io:

```
docker run -it -e REDIS_IP=172.17.0.2 -e DB_NAME=0 -e DB_PASSWORD=turn -e MIN_PORT=40000 -e MAX_PORT=65535 -e TURN_PUBLIC_IP=auto -e TURN_LISTEN_PORT=3478 --network=host openvidu/openvidu-coturn
```

## Execute turn locally with fixed username and password
```
docker run -it -e TURN_PUBLIC_IP=auto -e TURN_USERNAME_PASSWORD=<USER>:<PASSWORD> -e MIN_PORT=40000 -e MAX_PORT=65535 -e TURN_LISTEN_PORT=3478 --network=host openvidu/openvidu-coturn
```


# Kubernetes

TODO
