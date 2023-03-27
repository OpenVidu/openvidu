# OpenVidu Deployment Tester

This is a simple python automation script to test the deployment of any kind of OpenVidu Server deployment. Its purpose is to test most general deployment scenarios and to provide a simple and portable way to test the deployment of OpenVidu Server.

The script uses selenium to control a browser and execute the tests. As this automation tool is packaged in a docker container, it is not necessary to install any other dependency in the machine where the script is going to be executed.

## Requirements
- A working OpenVidu Server deployment (CE/PRO/Enterprise)
- Docker installed in the machine where the script is going to be executed.
- OpenVidu Call. It is not strictly necessary, but it is recommended to execute some tests.

## Test cases

### 1. Basic Test

This test case will simply check from the dashboard (CE) or Inspector (PRO/Enterprise) that OpenVidu WebRTC minimal capabilities are working (Video and TURN)

**1. OpenVidu CE without forcing TURN candidates to be used (Chrome)**

```bash
docker run openvidu/openvidu-deployment-tester basic-test \
        --openvidu-url <OPENVIDU_URL> \
        --openvidu-secret <OPENVIDU_SECRET> \
        --openvidu-edition ce \
        --browser chrome
```

**2. OpenVidu CE without forcing TURN candidates to be used (Firefox)**

```bash
docker run openvidu/openvidu-deployment-tester basic-test \
        --openvidu-url <OPENVIDU_URL> \
        --openvidu-secret <OPENVIDU_SECRET> \
        --openvidu-edition ce \
        --browser firefox
```

**3. OpenVidu CE forcing TURN candidates to be used (Firefox)**

```bash
docker run openvidu/openvidu-deployment-tester basic-test \
        --openvidu-url <OPENVIDU_URL> \
        --openvidu-secret <OPENVIDU_SECRET> \
        --openvidu-edition ce \
        --browser firefox \
        --turn
```

**4. OpenVidu PRO without forcing TURN candidates to be used (Chrome)**

```bash
docker run openvidu/openvidu-deployment-tester basic-test \
        --openvidu-url <OPENVIDU_URL> \
        --openvidu-secret <OPENVIDU_SECRET> \
        --openvidu-edition pro \
        --browser chrome
```

**5. OpenVidu PRO without forcing TURN candidates to be used (Firefox)**

```bash
docker run openvidu/openvidu-deployment-tester basic-test \
        --openvidu-url <OPENVIDU_URL> \
        --openvidu-secret <OPENVIDU_SECRET> \
        --openvidu-edition pro \
        --browser firefox
```

**6. OpenVidu PRO forcing TURN candidates to be used (Firefox)**

```bash
docker run openvidu/openvidu-deployment-tester basic-test \
        --openvidu-url <OPENVIDU_URL> \
        --openvidu-secret <OPENVIDU_SECRET> \
        --openvidu-edition ce \
        --browser firefox \
        --turn
```

### 2. Recording tests

Working on...

## Development and Build instructions

### Requirements

- Python >= 3
- pip
- virtualenv

### Instructions

1. In the directory of this README file, create a virtual environment and activate it:

```bash
virtualenv -p python3 python_modules

source python_modules/bin/activate
```

2. Install the python dependencies:

```bash
pip install -r requirements.txt
```

3. Run the script:

```bash
cd src

python main.py -h
```

4. To build the docker image:

```bash
./create_imagh.sh latest
```
