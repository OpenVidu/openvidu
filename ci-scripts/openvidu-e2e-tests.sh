#!/bin/bash -x
set -eu -o pipefail

# Ci flags
PREPARE=false
BUILD_OV_BROWSER=false
BUILD_OV_NODE_CLIENT=false
BUILD_OV_JAVA_CLIENT=false
BUILD_OV_TESTAPP=false
BUILD_OV_DASHBOARD=false
OV_PRE_BUILD=false
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
    DOCKER_HOST_IP="$(docker network inspect bridge | grep Gateway | cut -d'"' -f4)"
    openssl req -newkey rsa:2048 \
        -new -nodes -x509 -days 3650 \
        -subj "/CN=www.mydom.com/O=My Company LTD./C=US" \
        -keyout /opt/openvidu/testapp/key.pem \
        -out /opt/openvidu/testapp/cert.pem
    pushd /opt/openvidu/testapp
    http-server -S -p 4200 &> /opt/openvidu/testapp.log &
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
    DOCKER_HOST_IP="$(docker network inspect bridge | grep Gateway | cut -d'"' -f4)"


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
            --prepare )
                PREPARE=true
                shift 1
                ;;
            --build-openvidu-browser )
                BUILD_OV_BROWSER=true
                shift 1
                ;;
            --build-openvidu-node-client )
                BUILD_OV_NODE_CLIENT=true
                shift 1
                ;;
            --build-openvidu-java-client )
                BUILD_OV_JAVA_CLIENT=true
                shift 1
                ;;
            --build-openvidu-testapp )
                BUILD_OV_TESTAPP=true
                shift 1
                ;;
            --build-dashboard )
                BUILD_OV_DASHBOARD=true
                shift 1
                ;;
            --openvidu-server-pre-build )
                OV_PRE_BUILD=true
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
# 1. Prepare build
# -------------
if [[ "${PREPARE}" == true || "${EXECUTE_ALL}" == true ]]; then

    # Connect e2e test container to network bridge so it is vissible for browser and media server containers
    E2E_CONTAINER_ID="$(docker ps  | grep  'openvidu/openvidu-test-e2e:*' | awk '{ print $1 }')"
    docker network connect bridge "${E2E_CONTAINER_ID}"

    # Pull browser images
    docker pull selenium/standalone-chrome:"${CHROME_VERSION}"
    docker pull selenium/standalone-firefox:"${FIREFOX_VERSION}"
    docker pull selenium/standalone-opera:"${OPERA_VERSION}"
    docker pull selenium/standalone-edge:"${EDGE_VERSION}"

    # Pull mediasoup and kurento
    docker pull openvidu/mediasoup-controller:"${MEDIASOUP_CONTROLLER_VERSION}"
    docker pull "${KURENTO_MEDIA_SERVER_IMAGE}"

    # Prepare directory Openvidu
    sudo mkdir -p /opt/openvidu/recordings && sudo chmod 777 /opt/openvidu/recordings


    # Configure Snapshots repository
    if [[ -n "${KURENTO_SNAPSHOTS_URL}" ]]; then
        pushd ci-scripts
        sed -i "s|KURENTO_SNAPSHOTS_URL|${KURENTO_SNAPSHOTS_URL}|g" kurento-snapshots.xml
        rm /etc/maven/settings.xml
        mv kurento-snapshots.xml /etc/maven/settings.xml
        popd
    fi

    # Download fake videos
    FAKE_VIDEO1=/opt/openvidu/barcode.y4m
    FAKE_VIDEO2=/opt/openvidu/girl.mjpeg
    if [ ! -f ${FAKE_VIDEO1} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/barcode.y4m --create-dirs --output /opt/openvidu/barcode.y4m
    else
        echo "File ${FAKE_VIDEO1} already exists"
    fi
    if [ ! -f ${FAKE_VIDEO2} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/girl.mjpeg --create-dirs --output /opt/openvidu/girl.mjpeg
    else
        echo "File ${FAKE_VIDEO2} already exists"
    fi

    # Download fake audio
    FAKE_AUDIO=/opt/openvidu/fakeaudio.wav
    if [ ! -f ${FAKE_AUDIO} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/fakeaudio.wav --create-dirs --output /opt/openvidu/fakeaudio.wav
    else
        echo "File ${FAKE_AUDIO} already exists"
    fi
    curl --location https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-test-e2e/docker/my-custom-layout/index.html --create-dirs --output /opt/openvidu/test-layouts/layout1/index.html
    chmod -R 777 /opt/openvidu

fi

# -------------
# 2. OpenVidu Browser build
# -------------
if [[ "${BUILD_OV_BROWSER}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-browser || exit 1
    npm install
    npm run build
    npm link
    popd
fi

# -------------
# 3. OpenVidu Node client build
# -------------
if [[ "${BUILD_OV_NODE_CLIENT}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-node-client
    npm install --legacy-peer-deps
    npm run build
    npm link
    popd
fi

# -------------
# 4. OpenVidu Java client build
# -------------
if [[ "${BUILD_OV_JAVA_CLIENT}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-java-client
    mvn -B versions:set -DnewVersion=TEST
    mvn -B clean compile package
    mvn -B install:install-file -Dfile=target/openvidu-java-client-TEST.jar -DgroupId=io.openvidu -DartifactId=openvidu-java-client -Dversion=TEST -Dpackaging=jar
    popd
fi

# -------------
# 5. OpenVidu Test App build
# -------------
if [[ "${BUILD_OV_TESTAPP}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-testapp
    npm install --legacy-peer-deps
    npm link --legacy-peer-deps openvidu-browser openvidu-node-client
    export NG_CLI_ANALYTICS="false" && ./node_modules/@angular/cli/bin/ng build --prod --output-path=/opt/openvidu/testapp
    popd
fi

# -------------
# 6. OpenVidu Dashboard build
# -------------
if [[ "${BUILD_OV_DASHBOARD}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server/src/dashboard
    npm install
    npm link openvidu-browser openvidu-node-client
    npm run build-prod
    popd
fi

# -------------
# 7. OpenVidu Pre build
# -------------
if [[ "${OV_PRE_BUILD}" == true || "${EXECUTE_ALL}" == true ]]; then
    if [[ ${KURENTO_JAVA_COMMIT} != "default" ]]; then
        git clone https://github.com/Kurento/kurento-java.git
        pushd kurento-java
        git checkout -f "${KURENTO_JAVA_COMMIT}"
        MVN_VERSION="$(grep -oPm1 "(?<=<version>)[^<]+" "pom.xml")"
        mvn -B -Dmaven.artifact.threads=1 clean install
        popd
        rm -rf kurento-java
        mvn -B versions:set-property -Dproperty=version.kurento -DnewVersion="${MVN_VERSION}"
    fi

    mvn -B versions:set-property -Dproperty=version.openvidu.java.client -DnewVersion=TEST
    mvn -B -DskipTests=true clean install

fi

# -------------
# 8. OpenVidu Unit tests
# -------------
if [[ "${OV_UNIT_TESTS}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server
    mvn -B -Dtest=io.openvidu.server.test.unit.*Test test
    popd
fi

# -------------
# 9. OpenVidu Unit tests
# -------------
if [[ "${OV_INTEGRATION_TESTS}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server
    mvn -B -Dtest=io.openvidu.server.test.integration.*Test test
    popd
fi

# -------------
# 10. OpenVidu E2E Tests build
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
# 11. OpenVidu Server build
# -------------
if [[ "${OV_SERVER_BUILD}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-server
    mvn -B -DskipTests=true package
    cp target/openvidu-server*.jar /opt/openvidu
    popd
fi

# -------------
# 12. Environment launch Kurento
# -------------
if [[ "${LAUNCH_OV_KURENTO}" == true || "${EXECUTE_ALL}" == true ]]; then
    environmentLaunch "kurento"
fi

# -------------
# 13. OpenVidu E2E Tests Kurento
# -------------
if [[ "${OV_E2E_KURENTO}" == true || "${EXECUTE_ALL}" == true ]]; then
    openviduE2ETests "kurento"
fi

# -------------
# 14. Environment launch mediasoup
# -------------
if [[ "${LAUNCH_OV_MEDIASOUP}" == true || "${EXECUTE_ALL}" == true ]]; then
    environmentLaunch "mediasoup"
fi

# -------------
# 15. OpenVidu E2E Tests Kurento
# -------------
if [[ "${OV_E2E_MEDIASOUP}" == true || "${EXECUTE_ALL}" == true ]]; then
    openviduE2ETests "mediasoup"
fi