#!/bin/bash -x
set -eu -o pipefail

############################################################################
# Any function offered by this file that is not path agnostic assumes that #
# the path is located where the first command of each function requires it #
############################################################################

# CI flags
PREPARE_TEST_ENVIRONMENT=false
USE_SPECIFIC_KURENTO_JAVA_COMMIT=false
SERVE_OV_TESTAPP=false

if [[ -n ${1:-} ]]; then
    case "${1:-}" in

    --prepare-test-environment)
        PREPARE_TEST_ENVIRONMENT=true
        ;;

    --use-specific-kurento-java-commit)
        USE_SPECIFIC_KURENTO_JAVA_COMMIT=true
        ;;

    --serve-openvidu-testapp)
        SERVE_OV_TESTAPP=true
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
# Prepare build
# -------------
if [[ "${PREPARE_TEST_ENVIRONMENT}" == true ]]; then

    # Connect e2e test container to network bridge so it is vissible for browser and media server containers
    if [[ -n "${TEST_IMAGE}" ]]; then
        E2E_CONTAINER_ID="$(docker ps | grep "$TEST_IMAGE" | awk '{ print $1 }')" || echo "Docker container not found for image ${TEST_IMAGE}"
        if [[ -n "${E2E_CONTAINER_ID}" ]]; then
            docker network connect bridge "${E2E_CONTAINER_ID}"
        else
            echo "Could not connect test docker container to docker bridge, because no running container was found for image \"${TEST_IMAGE}\""
        fi
    else
        echo "No TEST_IMAGE env var provided. Skipping network bridge connection"
    fi

    # Prepare directory for OpenVidu recordings
    sudo mkdir -p /opt/openvidu/recordings && sudo chmod 777 /opt/openvidu/recordings
    # Prepare directory for OpenVidu Android apps
    sudo mkdir -p /opt/openvidu/android && sudo chmod 777 /opt/openvidu/android

    # Configure Snapshots repository
    if [[ -n "${KURENTO_SNAPSHOTS_URL:-}" ]]; then
        sudo mkdir -p /etc/maven
        sudo chmod -R 777 /etc/maven
        pushd /etc/maven
        rm -f settings.xml
        curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/ci-scripts/kurento-snapshots.xml -o settings.xml
        sed -i "s|KURENTO_SNAPSHOTS_URL|${KURENTO_SNAPSHOTS_URL}|g" settings.xml
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

    # Download fake audios
    FAKE_AUDIO1=/opt/openvidu/fakeaudio.wav
    FAKE_AUDIO2=/opt/openvidu/stt-test.wav
    if [ ! -f ${FAKE_AUDIO1} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/fakeaudio.wav --create-dirs --output /opt/openvidu/fakeaudio.wav
    else
        echo "File ${FAKE_AUDIO1} already exists"
    fi
    if [ ! -f ${FAKE_AUDIO2} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/stt-test.wav --create-dirs --output /opt/openvidu/stt-test.wav
    else
        echo "File ${FAKE_AUDIO2} already exists"
    fi

    # Download recording custom layout
    sudo curl --location https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-test-e2e/docker/my-custom-layout/index.html --create-dirs --output /opt/openvidu/test-layouts/layout1/index.html

    # Open permissions for /opt/openvidu folder
    sudo chmod -R 777 /opt/openvidu

    # Pull browser images
    # Pull chrome image if env variable CHROME_VERSION is set
    if [[ -n "${CHROME_VERSION:-}" ]]; then
        docker pull selenium/standalone-chrome:"${CHROME_VERSION}"
    fi
    # Pull firefox image if env variable FIREFOX_VERSION is set
    if [[ -n "${FIREFOX_VERSION:-}" ]]; then
        docker pull selenium/standalone-firefox:"${FIREFOX_VERSION}"
    fi
    # Pull edge image if env variable EDGE_VERSION is set
    if [[ -n "${EDGE_VERSION:-}" ]]; then
        docker pull selenium/standalone-edge:"${EDGE_VERSION}"
    fi
    # Pull Docker Android image if env variable DOCKER_ANDROID_IMAGE is set
    if [[ -n "${DOCKER_ANDROID_IMAGE:-}" ]]; then
        docker pull "${DOCKER_ANDROID_IMAGE}"
    fi

    # Pull mediasoup and kurento
    if [[ -n "${MEDIASOUP_CONTROLLER_VERSION:-}" ]]; then
        docker pull openvidu/mediasoup-controller:"${MEDIASOUP_CONTROLLER_VERSION}"
    fi
    if [[ -n "${KURENTO_MEDIA_SERVER_IMAGE:-}" ]]; then
        docker pull "${KURENTO_MEDIA_SERVER_IMAGE}"
    fi

fi

# -------------
# Use a specific kurento-java commit other than the configured in openvidu-parent pom.xml
# -------------
if [[ "${USE_SPECIFIC_KURENTO_JAVA_COMMIT}" == true ]]; then

    git clone https://github.com/Kurento/kurento.git
    pushd kurento/clients/java
    git checkout -f "${KURENTO_JAVA_COMMIT}"
    MVN_VERSION=$(mvn -q -Dexec.executable=echo -Dexec.args='${project.version}' --non-recursive exec:exec)
    mvn -B -Dmaven.artifact.threads=1 clean install
    popd
    rm -rf kurento
    mvn -B versions:set-property \
        -Dproperty=version.kurento \
        -DnewVersion="${MVN_VERSION}"

fi

# -------------
# Serve openvidu-testapp
# -------------
if [[ "${SERVE_OV_TESTAPP}" == true ]]; then
    # Generate certificate
    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 \
        -subj "/CN=www.mydom.com/O=My Company LTD./C=US" \
        -keyout /opt/openvidu/testapp/key.pem \
        -out /opt/openvidu/testapp/cert.pem

    # Serve TestApp
    pushd /opt/openvidu/testapp
    http-server -S -p 4200 &>/opt/openvidu/testapp.log &
    popd
fi
