#!/bin/bash -x
set -eu -o pipefail

# Ci flags
BUILD_OV_DASHBOARD=false
OV_INTEGRATION_TESTS=false
OV_UNIT_TESTS=false
OV_E2E_TESTS_BUILD=false
OV_SERVER_BUILD=false
LAUNCH_OV_KURENTO=false
OV_E2E_KURENTO=false
LAUNCH_OV_MEDIASOUP=false
OV_E2E_MEDIASOUP=false
EXECUTE_ALL=false

function environmentLaunch {
    local MEDIA_SERVER="$1"

    # Get e2e container id
    local E2E_CONTAINER_ID
    E2E_CONTAINER_ID="$(docker ps  | grep  'openvidu/openvidu-test-e2e:*' | awk '{ print $1 }')"

    # Get e2e container IP so services running can be accessed by browser and media server containers
    local E2E_CONTAINER_IP
    E2E_CONTAINER_IP="$(docker inspect "$E2E_CONTAINER_ID" | awk '/bridge/,/IPAddress/' | grep IPAddress | cut -d'"' -f4)"

    # Kurento and mediasoup needs to run as network host, so we need Docker host IP.
    local DOCKER_HOST_IP
    DOCKER_HOST_IP="$(docker network inspect bridge | grep Subnet | cut -d'"' -f4 | cut -d'/' -f1 | sed 's/.$/1/')"

    if [[ "${MEDIA_SERVER}" == "kurento" ]]; then
        docker run -e KMS_UID=$(id -u) --network=host --detach=true --volume=/opt/openvidu/recordings:/opt/openvidu/recordings "${KURENTO_MEDIA_SERVER_IMAGE}"
        while true; do
            RC="$(curl \
            --silent \
            --no-buffer \
            --write-out '%{http_code}' \
            --header "Connection: Upgrade" \
            --header "Upgrade: websocket" \
            --header "Host: ${DOCKER_HOST_IP}" \
            --header "Origin: ${DOCKER_HOST_IP}" \
            "http://${DOCKER_HOST_IP}:8888/kurento" || echo '')"

            if [[ "$RC" == "500" ]]; then
                break
            else
                echo "Waiting for ${MEDIA_SERVER}..."
                sleep 1
            fi
        done
    elif [[ "${MEDIA_SERVER}" == "mediasoup" ]]; then
        docker run --network=host --restart=always --detach=true \
            --env=KMS_MIN_PORT=40000 \
            --env=KMS_MAX_PORT=65535 \
            --env=OPENVIDU_PRO_LICENSE="${OPENVIDU_PRO_LICENSE}" \
            --env=OPENVIDU_PRO_LICENSE_API="${OPENVIDU_PRO_LICENSE_API}" \
            --env=WEBRTC_LISTENIPS_0_ANNOUNCEDIP="${DOCKER_HOST_IP}" \
            --env=WEBRTC_LISTENIPS_0_IP="${DOCKER_HOST_IP}" \
            --volume=/opt/openvidu/recordings:/opt/openvidu/recordings \
            openvidu/mediasoup-controller:"${MEDIASOUP_CONTROLLER_VERSION}"
        until $(curl --insecure --output /dev/null --silent http://${DOCKER_HOST_IP}:8888/kurento); do echo "Waiting for ${MEDIA_SERVER}..."; sleep 1; done
    else
        echo "Not valid media server"
        exit 1
    fi

    if [ "${DOCKER_RECORDING_VERSION}" != "default" ]; then
        echo "Using custom openvidu-recording tag: ${DOCKER_RECORDING_VERSION}"
        java -jar -DKMS_URIS="[\"ws://${DOCKER_HOST_IP}:8888/kurento\"]" \
            -DDOMAIN_OR_PUBLIC_IP="${E2E_CONTAINER_IP}" \
            -DOPENVIDU_SECRET=MY_SECRET -DHTTPS_PORT=4443 -DOPENVIDU_RECORDING=true \
            -DOPENVIDU_RECORDING_CUSTOM_LAYOUT=/opt/openvidu/test-layouts \
            -DOPENVIDU_RECORDING_VERSION="${DOCKER_RECORDING_VERSION}" -DOPENVIDU_WEBHOOK=true \
            -DOPENVIDU_WEBHOOK_ENDPOINT=http://127.0.0.1:7777/webhook \
            /opt/openvidu/openvidu-server-*.jar &> /opt/openvidu/openvidu-server-"${MEDIA_SERVER}".log &
    else
        echo "Using default openvidu-recording tag"
        java -jar -DKMS_URIS="[\"ws://${DOCKER_HOST_IP}:8888/kurento\"]" \
            -DDOMAIN_OR_PUBLIC_IP="${E2E_CONTAINER_IP}" \
            -DOPENVIDU_SECRET=MY_SECRET -DHTTPS_PORT=4443 -DOPENVIDU_RECORDING=true \
            -DOPENVIDU_RECORDING_CUSTOM_LAYOUT=/opt/openvidu/test-layouts -DOPENVIDU_WEBHOOK=true \
            -DOPENVIDU_WEBHOOK_ENDPOINT=http://127.0.0.1:7777/webhook \
            /opt/openvidu/openvidu-server-*.jar &> /opt/openvidu/openvidu-server-"${MEDIA_SERVER}".log &
    fi
    until $(curl --insecure --output /dev/null --silent --head --fail https://OPENVIDUAPP:MY_SECRET@localhost:4443/); do echo "Waiting for openvidu-server..."; sleep 2; done
    popd
}

function openviduE2ETests {
    local MEDIA_SERVER="$1"

    # Get e2e container id
    local E2E_CONTAINER_ID
    E2E_CONTAINER_ID="$(docker ps  | grep  'openvidu/openvidu-test-e2e:*' | awk '{ print $1 }')"

    # Get e2e container IP so services running can be accessed by browser and media server containers
    local E2E_CONTAINER_IP
    E2E_CONTAINER_IP="$(docker inspect "$E2E_CONTAINER_ID" | awk '/bridge/,/IPAddress/' | grep IPAddress | cut -d'"' -f4)"

    # Kurento and mediasoup needs to run as network host, so we need Docker host IP.
    local DOCKER_HOST_IP
    DOCKER_HOST_IP="$(docker network inspect bridge | grep Subnet | cut -d'"' -f4 | cut -d'/' -f1 | sed 's/.$/1/')"


    pushd openvidu-test-e2e
    if [[ "${MEDIA_SERVER}" == "kurento" ]]; then

        mvn -DMEDIA_SERVER_IMAGE="${KURENTO_MEDIA_SERVER_IMAGE}" \
            -DOPENVIDU_URL="https://${E2E_CONTAINER_IP}:4443" \
            -DCHROME_VERSION="${CHROME_VERSION}" \
            -DFIREFOX_VERSION="${FIREFOX_VERSION}" \
            -DOPERA_VERSION="${OPERA_VERSION}" \
            -DEDGE_VERSION="${EDGE_VERSION}" \
            -Dtest=OpenViduTestAppE2eTest \
            -DAPP_URL="https://${E2E_CONTAINER_IP}:4200" \
            -DEXTERNAL_CUSTOM_LAYOUT_URL="http://${E2E_CONTAINER_IP}:4114" \
            -DREMOTE_URL_CHROME="http://${DOCKER_HOST_IP}:6666/wd/hub/" \
            -DREMOTE_URL_FIREFOX="http://${DOCKER_HOST_IP}:6667/wd/hub/" \
            -DREMOTE_URL_OPERA="http://${DOCKER_HOST_IP}:6668/wd/hub/" \
            -DREMOTE_URL_EDGE="http://${DOCKER_HOST_IP}:6669/wd/hub/" \
            -DEXTERNAL_CUSTOM_LAYOUT_PARAMS="sessionId,CUSTOM_LAYOUT_SESSION,secret,MY_SECRET" test

    elif [[ "${MEDIA_SERVER}" == "mediasoup" ]]; then

        mvn -DMEDIA_SERVER_IMAGE="openvidu/mediasoup-controller:${MEDIASOUP_CONTROLLER_VERSION}" \
            -DOPENVIDU_URL="https://${E2E_CONTAINER_IP}:4443" \
            -DCHROME_VERSION="${CHROME_VERSION}" \
            -DFIREFOX_VERSION="${FIREFOX_VERSION}" \
            -DOPERA_VERSION="${OPERA_VERSION}" \
            -DEDGE_VERSION="${EDGE_VERSION}" \
            -Dtest=OpenViduTestAppE2eTest \
            -DAPP_URL="https://${E2E_CONTAINER_IP}:4200" \
            -DEXTERNAL_CUSTOM_LAYOUT_URL="http://${E2E_CONTAINER_IP}:4114" \
            -DREMOTE_URL_CHROME="http://${DOCKER_HOST_IP}:6666/wd/hub/" \
            -DREMOTE_URL_FIREFOX="http://${DOCKER_HOST_IP}:6667/wd/hub/" \
            -DREMOTE_URL_OPERA="http://${DOCKER_HOST_IP}:6668/wd/hub/" \
            -DREMOTE_URL_EDGE="http://${DOCKER_HOST_IP}:6669/wd/hub/" \
            -DEXTERNAL_CUSTOM_LAYOUT_PARAMS="sessionId,CUSTOM_LAYOUT_SESSION,secret,MY_SECRET" \
            -DOPENVIDU_PRO_LICENSE="${OPENVIDU_PRO_LICENSE}" \
            -DOPENVIDU_PRO_LICENSE_API="${OPENVIDU_PRO_LICENSE_API}" test

    else
        echo "Not valid media server"
        exit 1
    fi
    stopMediaServer
    kill -9 $(pgrep -f /opt/openvidu/openvidu-server) || true
    popd
}

function stopMediaServer {
    # Remove Kurento Media Server
    declare -a arr=("kurento/kurento-media-server"
                    "openvidu/mediasoup-controller:")
    for image in "${arr[@]}"
    do
        docker ps -a | awk '{ print $1,$2 }' | grep "${image}" | awk '{ print $1 }' | xargs -I {} docker rm -f {} || true
    done
    docker ps -a
}

# Environment variables
if [[ -n ${1:-} ]]; then
    while :
    do
        case "${1:-}" in
            --build-dashboard )
                BUILD_OV_DASHBOARD=true
                shift 1
                ;;
            --openvidu-server-unit-tests )
                OV_UNIT_TESTS=true
                shift 1
                ;;
            --openvidu-server-integration-tests )
                OV_INTEGRATION_TESTS=true
                shift 1
                ;;
            --openvidu-test-e2e-build )
                OV_E2E_TESTS_BUILD=true
                shift 1
                ;;
            --openvidu-server-build )
                OV_SERVER_BUILD=true
                shift 1
                ;;
            --environment-launch-kurento )
                LAUNCH_OV_KURENTO=true
                shift 1
                ;;
            --openvidu-e2e-tests-kurento )
                OV_E2E_KURENTO=true
                shift 1
                ;;
            --environment-launch-mediasoup )
                LAUNCH_OV_MEDIASOUP=true
                shift 1
                ;;
            --openvidu-e2e-test-mediasoup )
                OV_E2E_MEDIASOUP=true
                shift 1
                ;;
            *)
                break
                ;;
        esac
    done
else
    EXECUTE_ALL=true
fi

# -------------
# OpenVidu Dashboard build
# -------------
if [[ "${BUILD_OV_DASHBOARD}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server/src/dashboard
    npm install
    npm link openvidu-browser openvidu-node-client
    npm run build-prod
    popd
fi

# -------------
# OpenVidu Unit tests
# -------------
if [[ "${OV_UNIT_TESTS}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server
    mvn -B -Dtest=io.openvidu.server.test.unit.*Test test
    popd
fi

# -------------
# OpenVidu Integration tests
# -------------
if [[ "${OV_INTEGRATION_TESTS}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server
    mvn -B -Dtest=io.openvidu.server.test.integration.*Test test
    popd
fi

# -------------
# OpenVidu E2E Tests build
# -------------
if [[ "${OV_E2E_TESTS_BUILD}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-test-browsers
    mvn -B versions:set -DnewVersion=TEST && mvn -B clean install
    popd
    mvn -B versions:set-property -Dproperty=version.openvidu.java.client -DnewVersion=TEST
    mvn -B versions:set-property -Dproperty=version.openvidu.test.browsers -DnewVersion=TEST
    pushd openvidu-test-e2e
    mvn -B -DskipTests=true clean install
    popd
fi

# -------------
# OpenVidu Server build
# -------------
if [[ "${OV_SERVER_BUILD}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server
    mvn -B -DskipTests=true package
    cp target/openvidu-server*.jar /opt/openvidu
    popd
fi

# -------------
# Environment launch Kurento
# -------------
if [[ "${LAUNCH_OV_KURENTO}" == true || "${EXECUTE_ALL}" == true ]]; then
    environmentLaunch "kurento"
fi

# -------------
# OpenVidu E2E Tests Kurento
# -------------
if [[ "${OV_E2E_KURENTO}" == true || "${EXECUTE_ALL}" == true ]]; then
    openviduE2ETests "kurento"
fi

# -------------
# Environment launch mediasoup
# -------------
if [[ "${LAUNCH_OV_MEDIASOUP}" == true || "${EXECUTE_ALL}" == true ]]; then
    environmentLaunch "mediasoup"
fi

# -------------
# OpenVidu E2E Tests mediasoup
# -------------
if [[ "${OV_E2E_MEDIASOUP}" == true || "${EXECUTE_ALL}" == true ]]; then
    openviduE2ETests "mediasoup"
fi