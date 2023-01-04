#!/bin/bash -x
set -eu -o pipefail

# CI flags
GITHUB_ACTIONS_ORIGINAL_WORKING_DIR="${PWD}"
GITHUB_ACTIONS_WORKING_DIR="${GITHUB_ACTIONS_WORKING_DIR:-}"
CLEAN_ENVIRONMENT=false
PREPARE=false
TEST_IMAGE="openvidu/openvidu-test-e2e"
PREPARE_KURENTO_SNAPSHOT=false
EXECUTE_ALL=false
BUILD_OV_BROWSER=false
BUILD_OV_NODE_CLIENT=false
BUILD_OV_JAVA_CLIENT=false
BUILD_OV_PARENT=false
BUILD_OV_TESTAPP=false
SERVE_OV_TESTAPP=false

# cd to directory if GITHUB_ACTIONS_WORKING_DIR is set
if [[ -n "${GITHUB_ACTIONS_WORKING_DIR:-}" ]]; then
    cd "${GITHUB_ACTIONS_WORKING_DIR}"
fi

# Environment variables
if [[ -n ${1:-} ]]; then
    while :
    do
        case "${1:-}" in
            --clean-environment )
                CLEAN_ENVIRONMENT=true
                shift 1
                ;;
            --prepare )
                PREPARE=true
                if [[ -n "${2:-}" ]]; then
                    TEST_IMAGE="${2}"
                fi
                shift 1
                ;;
            --prepare-kurento-snapshot )
                PREPARE_KURENTO_SNAPSHOT=true
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
            --build-openvidu-parent )
                BUILD_OV_PARENT=true
                shift 1
                ;;
            --build-openvidu-testapp )
                BUILD_OV_TESTAPP=true
                shift 1
                ;;
            --serve-openvidu-testapp )
                SERVE_OV_TESTAPP=true
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
# Clean environment
# -------------
if [[ "${CLEAN_ENVIRONMENT}" == true || "${EXECUTE_ALL}" == true ]]; then

    # Remove all running containers except test container and runner container
    ids=$(docker ps -a -q)
    for id in $ids
    do
        DOCKER_IMAGE=$(docker inspect --format='{{.Config.Image}}' $id)
        if [[ "${DOCKER_IMAGE}" != *"openvidu/openvidu-test-e2e"* ]] && [[ "${DOCKER_IMAGE}" != *"runner-deployment"* ]]; then
            echo "Removing container image '$DOCKER_IMAGE' with id '$id'"
            docker stop $id && docker rm $id
        fi
    done
    
    # Clean /opt/openvidu contents
    rm -rf /opt/openvidu/*

    # Recreate working dir just in case it was placed under /opt/openvidu
    if [[ -n "${GITHUB_ACTIONS_WORKING_DIR:-}" ]]; then
        mkdir -p "${GITHUB_ACTIONS_WORKING_DIR}"
    fi

fi

# -------------
# Prepare build
# -------------
if [[ "${PREPARE}" == true || "${EXECUTE_ALL}" == true ]]; then

    # Connect e2e test container to network bridge so it is vissible for browser and media server containers
    E2E_CONTAINER_ID="$(docker ps  | grep  "${TEST_IMAGE}":* | awk '{ print $1 }')"

    docker network connect bridge "${E2E_CONTAINER_ID}"

    # Pull browser images
    # Pull chrome image if env variable CHROME_VERSION is set
    if [[ -n "${CHROME_VERSION:-}" ]]; then
        docker pull selenium/standalone-chrome:"${CHROME_VERSION}"
    fi
    # Pull firefox image if env variable FIREFOX_VERSION is set
    if [[ -n "${FIREFOX_VERSION:-}" ]]; then
        docker pull selenium/standalone-firefox:"${FIREFOX_VERSION}"
    fi
    # Pull opera image if env variable OPERA_VERSION is set
    if [[ -n "${OPERA_VERSION:-}" ]]; then
        docker pull selenium/standalone-opera:"${OPERA_VERSION}"
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

    # Prepare directory for OpenVidu recordings
    sudo mkdir -p /opt/openvidu/recordings && sudo chmod 777 /opt/openvidu/recordings
    # Prepare directory for OpenVidu Android apps
    sudo mkdir -p /opt/openvidu/android && sudo chmod 777 /opt/openvidu/android


    # Configure Snapshots repository
    if [[ -n "${KURENTO_SNAPSHOTS_URL:-}" ]]; then
        # Cd to GITHUB_ACTIONS_ORIGINAL_WORKING_DIR only if GITHUB_ACTIONS_WORKING_DIR is set
        if [[ -n "${GITHUB_ACTIONS_WORKING_DIR:-}" ]]; then
            pushd "${GITHUB_ACTIONS_ORIGINAL_WORKING_DIR}"/ci-scripts
            curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/ci-scripts/kurento-snapshots.xml -o kurento-snapshots.xml
        else
            pushd ci-scripts
        fi
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
    chmod -R 777 /opt/openvidu

fi

# -------------
# Prepare Kurento Snapshots
# -------------
if [[ "${PREPARE_KURENTO_SNAPSHOT}" == true || "${EXECUTE_ALL}" == true ]]; then

    # Prepare Kurento Snapshot if it is configured
    if [[ $KURENTO_JAVA_COMMIT != "default" ]]; then
        git clone https://github.com/Kurento/kurento-java.git
        pushd kurento-java
        git checkout -f "${KURENTO_JAVA_COMMIT}"
        MVN_VERSION="$(grep -oPm1 "(?<=<version>)[^<]+" "pom.xml")"
        mvn -B -Dmaven.artifact.threads=1 clean install
        popd
        rm -rf kurento-java
        mvn -B versions:set-property \
            -Dproperty=version.kurento \
            -DnewVersion="${MVN_VERSION}"
    fi

fi

# -------------
# OpenVidu Browser build
# -------------
if [[ "${BUILD_OV_BROWSER}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-browser || exit 1
    npm install
    npm run build
    npm link
    npm pack && mv openvidu-browser-*.tgz /opt/openvidu/.
    popd
fi

# -------------
# OpenVidu Node client build
# -------------
if [[ "${BUILD_OV_NODE_CLIENT}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-node-client
    npm install
    npm run build
    npm link
    npm pack && mv openvidu-node-client-*.tgz /opt/openvidu/.
    popd
fi

# -------------
# OpenVidu Java client build
# -------------
if [[ "${BUILD_OV_JAVA_CLIENT}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-java-client
    mvn -B versions:set -DnewVersion=TEST
    mvn -B clean compile package
    mvn -B install:install-file -Dfile=target/openvidu-java-client-TEST.jar \
        -DgroupId=io.openvidu \
        -DartifactId=openvidu-java-client \
        -Dversion=TEST -Dpackaging=jar
    popd
fi

# -------------
# OpenVidu Parent build
# -------------
if [[ "${BUILD_OV_PARENT}" == true || "${EXECUTE_ALL}" == true ]]; then
    mvn -B versions:set-property -Dproperty=version.openvidu.java.client -DnewVersion=TEST
    mvn -B -DskipTests=true -Dmaven.artifact.threads=1 clean install
fi

# -------------
# OpenVidu Test App build
# -------------
if [[ "${BUILD_OV_TESTAPP}" == true || "${EXECUTE_ALL}" == true ]]; then
    pushd openvidu-testapp
    npm install
    npm link openvidu-browser openvidu-node-client
    export NG_CLI_ANALYTICS="false" && ./node_modules/@angular/cli/bin/ng.js build --configuration production --output-path=/opt/openvidu/testapp
    popd
fi

# -------------
# Serve OpenVidu TestApp
# -------------
if [[ "${SERVE_OV_TESTAPP}" == true || "${EXECUTE_ALL}" == true ]]; then
    # Generate certificate
    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 \
        -subj "/CN=www.mydom.com/O=My Company LTD./C=US" \
        -keyout /opt/openvidu/testapp/key.pem \
        -out /opt/openvidu/testapp/cert.pem

    # Serve TestApp
    pushd /opt/openvidu/testapp
    http-server -S -p 4200 &> /opt/openvidu/testapp.log &
    popd
fi