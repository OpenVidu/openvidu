# Openvidu CE deployment with docker-compose

> **IMPORTANT NOTE:** This procedure is in development an can change in any moment. Please use it with care and visit the page with frecuency.

This document describes how to deploy OpenVidu CE alongside OpenVidu Call (a basic videoconference application) using docker-compose.

Services installed following these instructions are:
- **OpenVidu Server (openvidu-server)**: This is the brain of OpenVidu platform. The signaling plane.
- **Kurento Media Server (kms)**: This is the hearth of the OpenVidu platform. In charge of media plane.
- **Coturn (coturn)**: Service used to allow media communications with browsers in certain special networks.
- **Redis (redis)**: Database to manage users in Coturn server.
- **Nginx (nginx)**: A reverse proxy used to configure SSL certificate and to allow both Openvidu Server and the Application in the standard https port (443).
- **Videoconference Application (app)**: A videoconference application deployed for demo porpouses. This application can be easily unistalled or changed by other application.

## 1. Prerequisites

You will need docker and docker-compose installed in your linux distribution. In theory, you can use any modern linux distribution, but we have tested with Ubuntu 18.04.

- [Install Docker](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
- [Install Docker Compose](https://docs.docker.com/compose/install/)

It is recommended to know basic concepts about docker and docker-compose to deploy and operate OpenVidu CE platform.

Open ports:

- 80 TCP: If you select Let's Encrypt to generate an SSL certificate this port is used by the generation process.
- 443 TCP: OpenVidu server and application are published in standard https port.
- 3478 TCP: Used by TURN Server to stablish media connections.
- 3478 UDP: Used by TURN Server to stablish media connections.
- 40000 - 57000 UDP: Ports used by Kurento Media Server to stablish media connections.
- 57001 - 65535 UDP: Used by TURN Server to stablish media connections.
- 57001 - 65535 TCP: Used by TURN Server to stablish media connections.

It is important to have a **domain name** pointing to the machine where you are are going to deploy OpenVidu. The platform is deployed using https because is mandatory to use WebRTC. Then, if you do not have a domain name, an ugly warning will appear to your users when enter to your site. And, of course, you can suffer a man in the middle attack. You don't need a valid SSL certificate as one can be created by Let's Encrypt in the installation process.

## 2. Deployment Instructions

### Clone Repository

First clone this repository and move to openvidu-docker-compose folder:

```
$ git clone https://github.com/OpenVidu/openvidu.git
$ cd openvidu/openvidu-server/docker/openvidu-docker-compose
```

### OpenVidu configuration

OpenVidu configuration is specified in the `.env` file with environment variables. 

**YOU MUST** specify the **DOMAIN_OR_PUBLIC_IP** of the machine and the **OPENVIDU_SECRET**. 

If you have a domain name, generate a certificate with Let's Encrypt or put your own certificate. 

All other config properties have sane defaults.

```
# OpenVidu configuration
# ----------------------
# Documentation: https://openvidu.io/docs/reference-docs/openvidu-server-params/

# OpenVidu SECRET used for apps and to access to the inspector. Change it.
OPENVIDU_SECRET=

# Domain name. If you do not have one, the public IP of the machine.
OPENVIDU_DOMAIN_OR_PUBLIC_IP=

# Openvidu Folder Record used for save the openvidu recording videos. Change it 
# with the folder you want to use from your host.
OPENVIDU_RECORDING_FOLDER=/opt/recordings

# Certificate type: 
# - selfsigned:  Self signed certificate. Not recommended for production use.  
#                Users will see an ERROR when connected to web page.
# - owncert:     Valid certificate purchased in a Internet services company.
#                Please put the certificates in same folder as docker-compose.yml
#                file with names certificate.key and certificate.cert.
# - letsencrypt: Generate a new certificate using letsencrypt. Please set the 
#                required contact email for Let's Encrypt in LETSENCRYPT_EMAIL 
#                variable.
CERTIFICATE_TYPE=selfsigned

# If CERTIFICATE_TYPE=letsencrypt, you need to configure a valid email for 
# notifications
LETSENCRYPT_EMAIL=user@example.com
```

> **NOTE:** If you want to try OpenVidu in local, take into account the following aspects:
* If you set `OPENVIDU_DOMAIN_OR_PUBLIC_IP=localhost` then in your browser you have to use `https://localhost/`. If you use `127.0.0.1` instead, you will have some issues.
* OpenVidu is dockerized, but it uses network_mode=host due to WebRTC needs. That is important to know because OpenVidu services will use some host ports that have to be available: 8888, 5443, 3478, 5442, 80 and 6379.

### Videoconference application

By default, the [OpenVidu Call application](https://openvidu.io/docs/demos/openvidu-call/) is deployed alongside OpenVide CE platform. This application is defined in the file `docker-compose.override.yml`.

```
version: '3.1'

services:
    # Change this if your want use your own application.
    # It's very important expose your application in port 5443
    # and use the http protocol.
    app:
        image: openvidu/openvidu-call:2.13.0-beta1
        restart: on-failure
        ports:
            - "5442:80"
        environment: 
            - OPENVIDU_URL=https://${OPENVIDU_DOMAIN_OR_PUBLIC_IP}
            - OPENVIDU_SECRET=${OPENVIDU_SECRET}
```

You can disable OpenVidu Call application deleting the file `docker-compose.override.yml` (or renaming it in case you want to enable again in the future).

You can configure other dockerized application if you want updating the content of `docker-compose.override.yml` with the following requirements:
* You have to bind your application port to 5442 in the host, as this port is used by NGINX to publish your app in port 443.
* The application must be served in plain http as NGINX is the responsible of managing SSL certificate.
* Remember that application needs to know how to connect to OpenVidu, for that, you can use the variables ${DOMAIN_OR_PUBLIC_IP} and ${OPENVIDU_SECRET} as shown in the sample file.

### Start services

To download and start the services (OpenVidu platform and the application) you can execute this command:

`$ docker-compose up -d`

Then, all services will be downloaded (only the first time) and executed.

The services will start its execution when you see this output in the shell:

```
Creating openvidu-docker-compose_coturn_1          ... done
Creating openvidu-docker-compose_app_1             ... done
Creating openvidu-docker-compose_kms_1             ... done
Creating openvidu-docker-compose_nginx_1           ... done
Creating openvidu-docker-compose_redis_1           ... done
Creating openvidu-docker-compose_openvidu-server_1 ... done
```

Then, you should check openvidu-server logs to verify if all is configured and working as expected. Use the following command:

```
$ docker-compose logs -f openvidu-server
```

For your convenience, you can execute the following script to perform these two commands (and stop previously started OpenVidu platform, just in case)

```
$ ./openvidu-restart.sh
```

When OpenVidu Platform is ready you will see this message:
```
----------------------------------------------------

   OpenVidu Platform is ready!
   ---------------------------

   * OpenVidu Server: https://server/

   * OpenVidu Dashboard: https://server/dashboard/

----------------------------------------------------
```

You can press `Ctrl+C` to come back to the shell and OpenVidu will be executed in the background. 

If all is ok, you can open OpenVidu Dashboard to verify if videoconference is working as expected. The user is `OPENVIDUAPP` and the password what you have configured in `.env` file.

If video conference application is started, it is available in https://server/

In case OpenVidu server founds any problem with the configuration, it will show a report instead of this message. For example, if you try to use the provided .env file without configuring OPENVIDU_SECRET and OPENVIDU_DOMAIN_OR_PUBLIC_IP you will see the following report

```
 
    Configuration errors
    --------------------
 
    * Property OPENVIDU_SECRET is not set. Cannot be empty.
    * Property OPENVIDU_DOMAIN_OR_PUBLIC_IP is not set. Cannot be empty
 
 
    Fix config errors
    ---------------
 
    1) Return to shell pressing Ctrl+C
    2) Set correct values in '.env' configuration file
    3) Restart OpenVidu with:
 
       $ ./openvidu-restart.sh
 
```


### Stop services

To stop the application exec this command:

`docker-compose stop`

### Change configuration

To change the configuration follow this steps:
* Change configuration in `.env` file
* Restart the service 

```
$ docker-compose down
$ docker-compose up -d
$ docker-compose logs -f openvidu-server
```

Or using the provided script:

```
$ ./openvidu-restart.sh
```

* Start the services: `$ docker-compose up -d`

## 3. What to do if OpenVidu is not working

### Show service logs

Take a look to service logs to see what happen. First, see openvidu-server logs:

```
$ docker-compose logs -f openvidu-server
```

Then, you can see all service logs togheter: 

`$ docker-compose logs -f`

Or you can inspect one by one the other services:

```
$ docker-compose logs -f kms
$ docker-compose logs -f nginx
$ docker-compose logs -f coturn
$ docker-compose logs -f redis
$ docker-compose logs -f app
```
### Review the configuration

Sometimes, we can have a typo when writing a property name. For this reason, openvidu-server print in the log all the configuration properties you are configured in the file and the default values for all other config properties. In that way, you can double check what openvidu-server *see*.

If `openvidu-server` detects some error, it will show it in the log.

```
   Configuration properties
   ---------------------  
   * CERTIFICATE_TYPE=selfsigned
   * OPENVIDU_CDR=false
   * OPENVIDU_CDR_PATH=log
   * OPENVIDU_DOMAIN_OR_PUBLIC_IP=d
   * OPENVIDU_RECORDING=true
   * OPENVIDU_RECORDING_AUTOSTOP-TIMEOUT=120
   * OPENVIDU_RECORDING_COMPOSED-URL=

...
```

### Change log level of the services

#### Openvidu Server Level logs

To change the level of `openvidu-server` logs change the property `OV_CE_DEBUG_LEVEL`.

#### Kurento Media Server Level logs

To change the level of Kurento Media Server `kms` logs change the property `KMS_DEBUG_LEVEL`. For more information about possible values visit https://doc-kurento.readthedocs.io/en/stable/features/logging.html

### Change Kurento Media Server docker image

OpenVidu and Kurento Media Server evolves at different rithm. Sometimes, it is possible that a new KMS is released but OpenVidu is not still updated. In that case, in case you hit a bug and that bug is solved in last KMS version, you can test if updating only KMS is working for you. `KMS_IMAGE` property allows you to specify the new KMS image.
