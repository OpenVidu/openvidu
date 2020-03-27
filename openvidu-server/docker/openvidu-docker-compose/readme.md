# Deploy Openvidu using Docker Compose

In this repository we explain how deploy a video call application stack using Openvidu Server and Openvidu Call.

## 1. Prerequisites:

This docker-compose running in Ubuntu 16.04 or Ubuntu 18.04. We need have a docker and docker-compose installed in the machine. For this propuse we proportionally the next documentation for how install docker and docker compose in Ubuntu.

- [Install Docker](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
- [Install Docker Compose](https://docs.docker.com/compose/install/)

We need open the next ports in the host:

- 80 TCP (Letsencrypt getting certificated by default in this port)
- 443 TCP (OpenVidu Server and Openvidu Call view Services section for more information)
- 3478 TCP (coturn listens on port 3478 by default)
- 3478 UDP (opening also UDP port has been proved to facilitate connections with certain type of clients)
- 40000 - 57000 UDP (Kurento Media Server listens on this ports)
- 40000 - 57000 UDP (Kurento Media Server listens on this ports)
- 57001 - 65535 UDP (WebRTC connections with clients may be established using a random port inside this range)
- 57001 - 65535 TCP (WebRTC connections with clients may be established using a random port inside this range, if UDP can't be used because client network is blocking it)

## 2. Deploy

### Clone Repository

First clone this repository:

`$ git clone https://github.com/OpenVidu/openvidu.git`

Change to this directory:

`cd openvidu/openvidu-server/docker/openvidu-docker-compose`

### Configure enviroment variables

Open the file `.env` and configure the following variables:

- OPENVIDU_SECRET: Used for apps and to acces to the inspector. Change it with yout secret
- DOMAIN_OR_PUBLIC_IP: Used for access the application, write the ip if you don't have a dns name or use your dns name if you have one
- OPENVIDU_RECORDING_FOLDER: Used for openvidu server recorder, select a valid folder for your host
- CERTIFICATE_TYPE: Only used if you have a dns name. Choose selfsigned for generate autfirmated certificated, this option will show a error menssage. Choose owncert if you have a certificateds or choose letsencrypt for auto generate certificated using letsencrypt.
- LETSENCRYPT_EMAIL: If you use letsencrypt certificated you need configurate a valid email for this propuse

### Deployment application

The application Openvidu Call is deployment by default in this docker-compose. The configuration of this application can will see in the file `docker-compose.override.yml`.

If your want deploy your own application change the `app` service in the `docker-compose.override.yml`. Just keep in mind expose your own application in the port `5442` and use `http`. 

### Run the application

For to start the application exec this command:

`docker-compose up`

When you see the message in console `OPENVIDU SERVER IP` the page is ready for enjoy it


### Stop the application

For to stop the application exec this command:

`docker-compose down`

