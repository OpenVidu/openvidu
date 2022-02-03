# Openvidu health checker

The main purpose of this image is to have a self-contained and independent docker image to test and check possible errors in OpenVidu deployments.

This image is also usefull to automation tests of infrastructure.

# Current health checks

## 1. Video working and Turn correctly setup

```
docker run --shm-size 2g \
    -e OV_URL=<OV_URL> \
    -e OV_SECRET=<OV_SECRET> \
    openvidu/openvidu-health-checker
```

Just put your OpenVidu url at `OV_URL` and your `OV_SECRET` and the stack will be tested.

This health check includes:

- 1. Inspector Test Video in **Chrome**
- 2. Inspector Test Video in **Firefox**
- 3. Inspector Test Video in **Firefox** with **TURN forced**.

If allways works:

- STUN/TURN is correctly configured
- Video Publishing/Subscribing works

If works sometimes:

- Bad ports opened.
- Bad internet connection.
- No possible connection via STUN/TURN

If don't work:

- Bad port configuration.
- No possible connection via STUN/TURN
- Simply a deployment which is not deployed correctly
