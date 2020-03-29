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

## 2. Deployment Instructions

### Clone Repository

First clone this repository and move to openvidu-docker-compose folder:

```
$ git clone https://github.com/OpenVidu/openvidu.git
$ cd openvidu
$ git checkout -b deploy-docker-compose origin/deploy-docker-compose
$ cd openvidu-server/docker/openvidu-docker-compose
```

### OpenVidu configuration

OpenVidu configuration is specified in the `.env` file with environment variables. 

**YOU MUST** specify the public IP or public domain name of your machine and OpenVidu password. All other values have sane defaults.

```
# OpenVidu configuration
# ----------------------
# Documentation: https://openvidu.io/docs/reference-docs/openvidu-server-params/

# OpenVidu SECRET used for apps and to access to the inspector. Change it.
OPENVIDU_SECRET=MY_SECRET

# Domain name. If you do not have one, the public IP of the machine.
DOMAIN_OR_PUBLIC_IP=openvidu.example.com

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
            - OPENVIDU_URL=https://${DOMAIN_OR_PUBLIC_IP}
            - OPENVIDU_SECRET=${OPENVIDU_SECRET}
```

You can disable it deleting the file `docker-compose.override.yml` (or renaming it in case you want to enable again in the future).

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

Then, you should check openvidu-server logs to verify if all is configured and working as expected with the following command:

```
$ docker-compose logs -f openvidu-server
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

In case OpenVidu server founds any problem, it will be shown instead of this message.

You can press `Ctrl+C` to come back to the shell.

If all is ok, you can open OpenVidu Dashboard to verify if videoconference is working as expected. The user is `OPENVIDUAPP` and the password what you have configured in `.env` file.

If videoconference application is started, it is available in https://server/

### Stop services

To stop the application exec this command:

`docker-compose stop`

### Change configuration

To change the configuration follow this steps:
* Reset the services: `$ docker-compose down`
* Change configuration in `.env` file
* Start the services: `$ docker-compose up -d`

> TODO: Review that changing domain name with CERTIFICATE_TYPE=letsencrypt regenerates the certificate.

### What to do if OpenVidu is not working

#### Show service logs

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

#### Updating the log level of the services

##### Openvidu Server Level logs
If it was necessary to change the level of the kms logs. In the .en file we go to the section "Openvidu Server Level logs" and change the variable `OV_CE_DEBUG_LEVEL`

##### Kurento Media Server Level logs
If it was necessary to change the level of the kms logs. In the .en file we go to the section "Kurento Media Server Level logs" and change the variable `KMS_DEBUG_LEVEL` for more information https://doc-kurento.readthedocs.io/en/stable/features/logging.html

### Use other Kurento Media Server docker image
If is necessaries change the Kurento Media Server image, go to the Kurento Media Server image section in the .env file and change the variable `KMS_IMAGE` with the new image that your want use
