# Deploy Openvidu using Docker Compose

In this repository we explain how deploy a video call application stack using Openvidu Server and Openvidu Call.

## 1. Prerequisites:

This docker-compose running in Ubuntu 16.04 or Ubuntu 18.04. We need have a docker and docker-compose installed in the machine. For this propuse we proportionally the next documentation for how install docker and docker compose in Ubuntu.

- [Install Docker](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
- [Install Docker Compose](https://docs.docker.com/compose/install/)

We need open the next ports:

- 443 TCP (OpenVidu Inspector is served on port 443 by default)
- 4443 TCP (OpenVidu Server Pro REST API endpoint listens on port 4443 by default)
- 3478 TCP (coturn listens on port 3478 by default)
- 3478 UDP (opening also UDP port has been proved to facilitate connections with certain type of clients)