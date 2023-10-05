#!/bin/bash -x
set -eu -o pipefail

############################################################################
# Any function offered by this file that is not path agnostic assumes that #
# the path is located where the first command of each function requires it #
############################################################################

OV_INTEGRATION_TESTS=false
OV_UNIT_TESTS=false
OV_E2E_KURENTO=false
OV_E2E_MEDIASOUP=false
LAUNCH_OV_KURENTO=false
LAUNCH_OV_MEDIASOUP=false

function environmentLaunch {
    local MEDIA_SERVER="$1"

    # Get e2e container id
    local E2E_CONTAINER_ID
    E2E_CONTAINER_ID="$(docker ps | grep "$TEST_IMAGE" | awk '{ print $1 }')"

    # Get e2e container IP so services running can be accessed by browser and media server containers
    local E2E_CONTAINER_IP
    E2E_CONTAINER_IP="$(docker inspect "$E2E_CONTAINER_ID" | awk '/bridge/,/IPAddress/' | grep IPAddress | cut -d'"' -f4)"

    # Kurento and mediasoup needs to run as network host, so we need Docker host IP.
    local DOCKER_HOST_IP
    DOCKER_HOST_IP="$(docker inspect bridge --format '{{with index .IPAM.Config 0}}{{or .Gateway .Subnet}}{{end}}' | sed -r 's|\.0/[[:digit:]]+$|.1|')"

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
        LOG_DATE=$(printf '%(%Y-%m-%d-%H-%M-%S)T')
        docker run --network=host --restart=always \
            --env=KMS_MIN_PORT=40000 \
            --env=KMS_MAX_PORT=65535 \
            --env=OPENVIDU_PRO_LICENSE="${OPENVIDU_PRO_LICENSE}" \
            --env=OPENVIDU_PRO_LICENSE_API="${OPENVIDU_PRO_LICENSE_API}" \
            --env=WEBRTC_LISTENIPS_0_ANNOUNCEDIP="${DOCKER_HOST_IP}" \
            --env=WEBRTC_LISTENIPS_0_IP="${DOCKER_HOST_IP}" \
            --volume=/opt/openvidu/recordings:/opt/openvidu/recordings \
            openvidu/mediasoup-controller:"${MEDIASOUP_CONTROLLER_VERSION}" >& /opt/openvidu/mediasoup-controller-${LOG_DATE}.log &
        until $(curl --insecure --output /dev/null --silent http://${DOCKER_HOST_IP}:8888/kurento); do
            echo "Waiting for ${MEDIA_SERVER}..."
            sleep 1
        done
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
            /opt/openvidu/openvidu-server-*.jar &>/opt/openvidu/openvidu-server-"${MEDIA_SERVER}".log &
    else
        echo "Using default openvidu-recording tag"
        java -jar -DKMS_URIS="[\"ws://${DOCKER_HOST_IP}:8888/kurento\"]" \
            -DDOMAIN_OR_PUBLIC_IP="${E2E_CONTAINER_IP}" \
            -DOPENVIDU_SECRET=MY_SECRET -DHTTPS_PORT=4443 -DOPENVIDU_RECORDING=true \
            -DOPENVIDU_RECORDING_CUSTOM_LAYOUT=/opt/openvidu/test-layouts -DOPENVIDU_WEBHOOK=true \
            -DOPENVIDU_WEBHOOK_ENDPOINT=http://127.0.0.1:7777/webhook \
            /opt/openvidu/openvidu-server-*.jar &>/opt/openvidu/openvidu-server-"${MEDIA_SERVER}".log &
    fi
    until $(curl --insecure --output /dev/null --silent --head --fail https://OPENVIDUAPP:MY_SECRET@localhost:4443/); do
        echo "Waiting for openvidu-server..."
        sleep 2
    done
}

function openviduE2ETests {
    local MEDIA_SERVER="$1"

    # Get e2e container id
    local E2E_CONTAINER_ID
    E2E_CONTAINER_ID="$(docker ps | grep "$TEST_IMAGE" | awk '{ print $1 }')"

    # Get e2e container IP so services running can be accessed by browser and media server containers
    local E2E_CONTAINER_IP
    E2E_CONTAINER_IP="$(docker inspect "$E2E_CONTAINER_ID" | awk '/bridge/,/IPAddress/' | grep IPAddress | cut -d'"' -f4)"

    # Kurento and mediasoup needs to run as network host, so we need Docker host IP.
    local DOCKER_HOST_IP
    DOCKER_HOST_IP="$(docker network inspect bridge | grep Subnet | cut -d'"' -f4 | cut -d'/' -f1 | sed 's/.$/1/' | grep 172)"

    pushd openvidu-test-e2e
    if [[ "${MEDIA_SERVER}" == "kurento" ]]; then

        mvn -DMEDIA_SERVER_IMAGE="${KURENTO_MEDIA_SERVER_IMAGE}" \
            -DOPENVIDU_URL="https://${E2E_CONTAINER_IP}:4443" \
            -DCHROME_VERSION="${CHROME_VERSION}" \
            -DFIREFOX_VERSION="${FIREFOX_VERSION}" \
            -DEDGE_VERSION="${EDGE_VERSION}" \
            -Dtest=OpenViduTestAppE2eTest \
            -DAPP_URL="https://${E2E_CONTAINER_IP}:4200" \
            -DEXTERNAL_CUSTOM_LAYOUT_URL="http://${E2E_CONTAINER_IP}:4114" \
            -DREMOTE_URL_CHROME="http://${DOCKER_HOST_IP}:6666/wd/hub/" \
            -DREMOTE_URL_FIREFOX="http://${DOCKER_HOST_IP}:6667/wd/hub/" \
            -DREMOTE_URL_OPERA="http://${DOCKER_HOST_IP}:6668/wd/hub/" \
            -DREMOTE_URL_EDGE="http://${DOCKER_HOST_IP}:6669/wd/hub/" \
            -DEXTERNAL_CUSTOM_LAYOUT_PARAMS="sessionId,CUSTOM_LAYOUT_SESSION,secret,MY_SECRET" \
            test

    elif [[ "${MEDIA_SERVER}" == "mediasoup" ]]; then

        mvn -DMEDIA_SERVER_IMAGE="openvidu/mediasoup-controller:${MEDIASOUP_CONTROLLER_VERSION}" \
            -DOPENVIDU_URL="https://${E2E_CONTAINER_IP}:4443" \
            -DCHROME_VERSION="${CHROME_VERSION}" \
            -DFIREFOX_VERSION="${FIREFOX_VERSION}" \
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
            -DOPENVIDU_PRO_LICENSE_API="${OPENVIDU_PRO_LICENSE_API}" \
            test

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
    for image in "${arr[@]}"; do
        docker ps -a | awk '{ print $1,$2 }' | grep "${image}" | awk '{ print $1 }' | xargs -I {} docker rm -f {} || true
    done
    docker ps -a
}

# Environment variables
if [[ -n ${1:-} ]]; then
    case "${1:-}" in
    --openvidu-server-unit-tests)
        OV_UNIT_TESTS=true
        ;;
    --openvidu-server-integration-tests)
        OV_INTEGRATION_TESTS=true
        ;;
    --openvidu-e2e-tests-kurento)
        OV_E2E_KURENTO=true
        ;;
    --openvidu-e2e-tests-mediasoup)
        OV_E2E_MEDIASOUP=true
        ;;
    --environment-launch-kurento)
        LAUNCH_OV_KURENTO=true
        ;;
    --environment-launch-mediasoup)
        LAUNCH_OV_MEDIASOUP=true
        ;;
    *)
        echo "Unrecognized method $1"
        exit 1
        ;;
    esac
else
    echo "Must provide a method to execute as first parameter when calling the script"
    exit 1
fi

# -------------
# openvidu-server unit tests
# -------------
if [[ "${OV_UNIT_TESTS}" == true ]]; then
    pushd openvidu-server
    mvn -B -Dtest=io.openvidu.server.test.unit.*Test test
    popd
fi

# -------------
# openvidu-server integration tests
# -------------
if [[ "${OV_INTEGRATION_TESTS}" == true ]]; then
    pushd openvidu-server
    mvn -B -Dtest=io.openvidu.server.test.integration.*Test test
    popd
fi

# -------------
# OpenVidu E2E Tests Kurento
# -------------
if [[ "${OV_E2E_KURENTO}" == true ]]; then
    openviduE2ETests "kurento"
fi

# -------------
# OpenVidu E2E Tests mediasoup
# -------------
if [[ "${OV_E2E_MEDIASOUP}" == true ]]; then
    openviduE2ETests "mediasoup"
fi

# -------------
# Environment launch Kurento
# -------------
if [[ "${LAUNCH_OV_KURENTO}" == true ]]; then
    environmentLaunch "kurento"
fi

# -------------
# Environment launch mediasoup
# -------------
if [[ "${LAUNCH_OV_MEDIASOUP}" == true ]]; then
    environmentLaunch "mediasoup"
fi
