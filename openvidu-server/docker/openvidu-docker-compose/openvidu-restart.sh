#!/bin/bash

docker-compose down
docker-compose up -d
docker-compose logs -f openvidu-server