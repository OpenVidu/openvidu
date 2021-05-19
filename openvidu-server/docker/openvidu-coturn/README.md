# OpenVidu Coturn

This is a minor modification from the official [coturn/coturn](https://hub.docker.com/r/coturn/coturn) image.
It just replace the `detect-external-ip.sh` with a custom one to use DNS to resolve getting the public IP.
