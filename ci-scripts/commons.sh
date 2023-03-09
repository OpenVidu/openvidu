#!/bin/bash -x
set -eu -o pipefail

################################################################
# Any functions offered by this file assume that the path is   #
# located where the first command of each function requires it #
################################################################

# CI flags
GITHUB_ACTIONS_ORIGINAL_WORKING_DIR="${PWD}"
GITHUB_ACTIONS_WORKING_DIR="${GITHUB_ACTIONS_WORKING_DIR:-}"

PREPARE_TEST_ENVIRONMENT=false
TEST_IMAGE="openvidu/openvidu-test-e2e"

CLEAN_ENVIRONMENT=false
PREPARE_KURENTO_SNAPSHOT=false
SERVE_OV_TESTAPP=false

# Build artifacts
BUILD_OV_BROWSER=false
BUILD_OV_NODE_CLIENT=false
BUILD_OV_JAVA_CLIENT=false
BUILD_OV_PARENT=false
BUILD_OV_TESTAPP=false
BUILD_OV_SERVER_DASHBOARD=false
BUILD_OV_SERVER=false
BUILD_OV_SERVER_DEPENDENCY=false
BUILD_OV_SERVER_PRO_INSPECTOR=false
BUILD_OV_SERVER_PRO=false

# Bump versions
BUMP_NPM_PROJECT_VERSION=false
BUMP_NPM_DEPENDENCY_VERSION=false
BUMP_MAVEN_PROJECT_VERSION=false
BUMP_MAVEN_PROPERTY_VERSION=false
BUMP_DOCKER_COMPOSE_SERVICE_VERSION=false
BUMP_DOCKER_COMPOSE_HEADER_VERSION=false
BUMP_DOCKER_IMAGE_VERSION_IN_FILES=false
BUMP_APPLICATION_PROPERTIES_VAR_VALUE=false

WAIT_FOR_NPM_DEPENDENCY=false

# cd to directory if GITHUB_ACTIONS_WORKING_DIR is set
# if [[ -n "${GITHUB_ACTIONS_WORKING_DIR:-}" ]]; then
#     cd "${GITHUB_ACTIONS_WORKING_DIR}"
# fi

# Environment variables
if [[ -n ${1:-} ]]; then
    case "${1:-}" in

    --clean-environment)
        CLEAN_ENVIRONMENT=true
        ;;

    --prepare-test-environment)
        PREPARE_TEST_ENVIRONMENT=true
        if [[ -n "${2:-}" ]]; then
            TEST_IMAGE="${2}"
        fi
        ;;

    --prepare-kurento-snapshot)
        PREPARE_KURENTO_SNAPSHOT=true
        ;;

    --build-openvidu-browser)
        BUILD_OV_BROWSER=true
        ;;

    --build-openvidu-node-client)
        BUILD_OV_NODE_CLIENT=true
        ;;

    --build-openvidu-java-client)
        BUILD_OV_JAVA_CLIENT=true
        ;;

    --build-openvidu-parent)
        BUILD_OV_PARENT=true
        ;;

    --build-openvidu-testapp)
        BUILD_OV_TESTAPP=true
        ;;

    --build-openvidu-server-dashboard)
        BUILD_OV_SERVER_DASHBOARD=true
        ;;

    --build-openvidu-server)
        BUILD_OV_SERVER=true
        ;;

    --build-openvidu-server-dependency)
        BUILD_OV_SERVER_DEPENDENCY=true
        ;;

    --build-openvidu-server-pro-inspector)
        BUILD_OV_SERVER_PRO_INSPECTOR=true
        ;;

    --build-openvidu-server-pro)
        BUILD_OV_SERVER_PRO=true
        ;;

    --serve-openvidu-testapp)
        SERVE_OV_TESTAPP=true
        ;;

    --bump-npm-project-version)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide VERSION as 1st parameter"
            exit 1
        fi
        BUMP_NPM_PROJECT_VERSION=true
        VERSION="${2}"
        ;;

    --bump-npm-dependency-version)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide DEPENDENCY as 1st parameter"
            exit 1
        fi
        if [[ -z "${3:-}" ]]; then
            echo "Must provide VERSION as 2nd parameter"
            exit 1
        fi
        BUMP_NPM_DEPENDENCY_VERSION=true
        DEPENDENCY="${2}"
        VERSION="${3}"
        ;;

    --bump-maven-project-version)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide VERSION as 1st parameter"
            exit 1
        fi
        BUMP_MAVEN_PROJECT_VERSION=true
        VERSION="${2}"
        ;;

    --bump-maven-property-version)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide PROPERTY as 1st parameter"
            exit 1
        fi
        if [[ -z "${3:-}" ]]; then
            echo "Must provide VERSION as 2nd parameter"
            exit 1
        fi
        BUMP_MAVEN_PROPERTY_VERSION=true
        PROPERTY="${2}"
        VERSION="${3}"
        ;;

    --bump-docker-compose-service-version)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide DOCKER_COMPOSE_FILE as 1st parameter"
            exit 1
        fi
        if [[ -z "${3:-}" ]]; then
            echo "Must provide SERVICE_IMAGE as 2nd parameter"
            exit 1
        fi
        if [[ -z "${4:-}" ]]; then
            echo "Must provide VERSION as 3rd parameter"
            exit 1
        fi
        BUMP_DOCKER_COMPOSE_SERVICE_VERSION=true
        DOCKER_COMPOSE_FILE="${2}"
        SERVICE_IMAGE="${3}"
        VERSION="${4}"
        ;;

    --bump-docker-compose-header-version)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide DOCKER_COMPOSE_FILE as 1st parameter"
            exit 1
        fi
        if [[ -z "${3:-}" ]]; then
            echo "Must provide HEADER as 2nd parameter"
            exit 1
        fi
        if [[ -z "${4:-}" ]]; then
            echo "Must provide VERSION as 3rd parameter"
            exit 1
        fi
        BUMP_DOCKER_COMPOSE_HEADER_VERSION=true
        DOCKER_COMPOSE_FILE="${2}"
        HEADER="${3}"
        VERSION="${4}"
        ;;

    --bump-docker-image-version-in-files)
        if [[ -z "${3:-}" ]]; then
            echo "Must provide FILE_NAME_PATTERN as 1st parameter"
            exit 1
        fi
        if [[ -z "${4:-}" ]]; then
            echo "Must provide IMAGE as 2nd parameter"
            exit 1
        fi
        if [[ -z "${4:-}" ]]; then
            echo "Must provide VERSION as 3rd parameter"
            exit 1
        fi
        BUMP_DOCKER_IMAGE_VERSION_IN_FILES=true
        FILE_NAME_PATTERN="${2}"
        IMAGE="${3}"
        VERSION="${4}"
        ;;

    --bump-application-properties-var-value)
        if [[ -z "${3:-}" ]]; then
            echo "Must provide APPLICATION_PROPERTIES_FILE as 2nd parameter"
            exit 1
        fi
        if [[ -z "${4:-}" ]]; then
            echo "Must provide VARIABLE as 3rd parameter"
            exit 1
        fi
        if [[ -z "${4:-}" ]]; then
            echo "Must provide VALUE as 4th parameter"
            exit 1
        fi
        BUMP_APPLICATION_PROPERTIES_VAR_VALUE=true
        APPLICATION_PROPERTIES_FILE="${2}"
        VARIABLE="${3}"
        VALUE="${4}"
        ;;

    --wait-for-npm-dependency)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide DEPENDENCY as 1st parameter"
            exit 1
        fi
        if [[ -z "${3:-}" ]]; then
            echo "Must provide VERSION as 2nd parameter"
            exit 1
        fi
        WAIT_FOR_NPM_DEPENDENCY=true
        DEPENDENCY="${2}"
        VERSION="${3}"
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

compareFiles() {
    if cmp -s "$1" "$1-AUX"; then
        rm -f $1-AUX
        echo "Error: no changes has been made to $1"
        echo "Trying to change \"$2\" to \"$3\""
        exit 1
    else
        cp -f "$1-AUX" "$1"
        rm -f "$1-AUX"
    fi
}

# -------------
# Clean environment
# -------------
if [[ "${CLEAN_ENVIRONMENT}" == true ]]; then

    # Remove all running containers except test container and runner container
    ids=$(docker ps -a -q)
    for id in $ids; do
        DOCKER_IMAGE=$(docker inspect --format='{{.Config.Image}}' $id)
        if [[ "${DOCKER_IMAGE}" != *"openvidu/openvidu-test-e2e"* ]] &&
            [[ "${DOCKER_IMAGE}" != *"runner-deployment"* ]] &&
            [[ "${DOCKER_IMAGE}" != *"openvidu/openvidu-dev-generic"* ]]; then
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
if [[ "${PREPARE_TEST_ENVIRONMENT}" == true ]]; then

    # Connect e2e test container to network bridge so it is vissible for browser and media server containers
    if [[ -n "${TEST_IMAGE}" ]]; then
        E2E_CONTAINER_ID="$(docker ps | grep "${TEST_IMAGE}":* | awk '{ print $1 }')" || echo "Docker container not found for image ${TEST_IMAGE}"
        if [[ -n "${E2E_CONTAINER_ID}" ]]; then
            docker network connect bridge "${E2E_CONTAINER_ID}"
        else
            echo "Could not connect test docker container \"${TEST_IMAGE}\" to docker bridge, because no running container was found"
        fi
    else
        echo "No TEST_IMAGE env var provided. Skipping network bridge connection"
    fi

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
        mkdir -p /etc/maven
        cd /etc/maven
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
    chmod -R 777 /opt/openvidu

fi

# -------------
# Prepare Kurento Snapshots
# -------------
if [[ "${PREPARE_KURENTO_SNAPSHOT}" == true ]]; then

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
# Build openvidu-browser
# -------------
if [[ "${BUILD_OV_BROWSER}" == true ]]; then
    pushd openvidu-browser || exit 1
    npm install
    npm run build
    npm link
    npm pack
    mv openvidu-browser-*.tgz /opt/openvidu
    popd
fi

# -------------
# Build openvidu-node-client
# -------------
if [[ "${BUILD_OV_NODE_CLIENT}" == true ]]; then
    pushd openvidu-node-client
    npm install
    npm run build
    npm link
    npm pack
    mv openvidu-node-client-*.tgz /opt/openvidu
    popd
fi

# -------------
# Build openvidu-java-client
# -------------
if [[ "${BUILD_OV_JAVA_CLIENT}" == true ]]; then
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
# Build openvidu-parent
# -------------
if [[ "${BUILD_OV_PARENT}" == true ]]; then
    mvn -B versions:set-property -Dproperty=version.openvidu.java.client -DnewVersion=TEST
    mvn -B -DskipTests=true -Dmaven.artifact.threads=1 clean install
fi

# -------------
# Build openvidu-testapp
# -------------
if [[ "${BUILD_OV_TESTAPP}" == true ]]; then
    pushd openvidu-testapp
    npm install
    npm link openvidu-browser openvidu-node-client
    export NG_CLI_ANALYTICS="false" && ./node_modules/@angular/cli/bin/ng.js build --configuration production --output-path=/opt/openvidu/testapp
    popd
fi

# -------------
# Build openvidu-server dashboard
# -------------
if [[ "${BUILD_OV_SERVER_DASHBOARD}" == true ]]; then
    pushd openvidu-server/src/dashboard
    npm install
    npm link openvidu-browser openvidu-node-client
    npm run build-prod
    popd
fi

# -------------
# Build openvidu-server
# -------------
if [[ "${BUILD_OV_SERVER}" == true ]]; then
    pushd openvidu-server
    mvn -B -DskipTests=true package
    mv target/openvidu-server*.jar /opt/openvidu
    popd
fi

# -------------
# Build openvidu-server dependency
# -------------
if [[ "${BUILD_OV_SERVER_DEPENDENCY}" == true ]]; then
    pushd openvidu-server
    mvn -B -DskipTests=true -Pdependency clean install
    popd
fi

# -------------
# Build Inspector
# -------------
if [[ "${BUILD_OV_SERVER_PRO_INSPECTOR}" == true ]]; then
    pushd dashboard
    npm install
    npm link openvidu-browser openvidu-node-client
    npm run build-server-prod
    popd
fi

# -------------
# Build openvidu-server-pro
# -------------
if [[ "${BUILD_OV_SERVER_PRO}" == true ]]; then
    pushd openvidu-server-pro
    mvn -B -DskipTests=true clean package
    mv target/openvidu-server-pro-*.jar /opt/openvidu
    popd
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

# -------------
# Bump NPM project version
# -------------
if [[ "${BUMP_NPM_PROJECT_VERSION}" == true ]]; then
    npm version ${VERSION} --git-tag-version=false --commit-hooks=false
fi

# -------------
# Bump NPM project dependency
# -------------
if [[ "${BUMP_NPM_DEPENDENCY_VERSION}" == true ]]; then
    tmp=$(mktemp) && jq -j ".dependencies.\"${DEPENDENCY}\" = \"${VERSION}\"" package.json >"$tmp" && mv "$tmp" package.json
    # npm install "${DEPENDENCY}@${VERSION}" --save-exact=true --legacy-peer-deps
fi

# -------------
# Bump Maven project version
# -------------
if [[ "${BUMP_MAVEN_PROJECT_VERSION}" == true ]]; then
    mvn -DskipTests=true versions:set -DnewVersion="${VERSION}"
fi

# -------------
# Bump Maven project property
# -------------
if [[ "${BUMP_MAVEN_PROPERTY_VERSION}" == true ]]; then

    if [[ -n "${OPENVIDU_MAVEN_GENERIC_SETTINGS:-}" ]]; then
        # Config file with Kurento Snapshots configuration only
        mkdir -p /tmp/maven-generic-settings
        echo "${OPENVIDU_MAVEN_GENERIC_SETTINGS}" >/tmp/maven-generic-settings/settings.xml
    fi

    mvn --batch-mode \
        --settings /tmp/maven-generic-settings/settings.xml \
        -DskipTests=true \
        versions:set-property \
        -Dproperty="${PROPERTY}" \
        -DnewVersion="${VERSION}"
fi

# -------------
# Bump docker-compose.yml service version
# -------------
if [[ "${BUMP_DOCKER_COMPOSE_SERVICE_VERSION}" == true ]]; then
    sed -r "s|image:\s+${SERVICE_IMAGE}:[[:alnum:]._-]+|image: ${SERVICE_IMAGE}:${VERSION}|g" ${DOCKER_COMPOSE_FILE} >${DOCKER_COMPOSE_FILE}-AUX
    compareFiles $DOCKER_COMPOSE_FILE $SERVICE_IMAGE $VERSION
fi

# -------------
# Bump docker-compose.yml header version
# -------------
if [[ "${BUMP_DOCKER_COMPOSE_HEADER_VERSION}" == true ]]; then
    sed -r "s|#\s+${HEADER}:\s+[[:alnum:]._-]+|#    ${HEADER}: ${VERSION}|g" ${DOCKER_COMPOSE_FILE} >${DOCKER_COMPOSE_FILE}-AUX
    compareFiles $DOCKER_COMPOSE_FILE $HEADER $VERSION
fi

# -------------
# Bump Docker image version in files
# -------------
if [[ "${BUMP_DOCKER_IMAGE_VERSION_IN_FILES}" == true ]]; then
    find . -type f -name ${FILE_NAME_PATTERN} | xargs sed -i -r "s|${IMAGE}:[[:alnum:]._-]+|${IMAGE}:${VERSION}|g"
fi

# -------------
# Bump application.properties variable value
# -------------
if [[ "${BUMP_APPLICATION_PROPERTIES_VAR_VALUE}" == true ]]; then
    sed -r "s%${VARIABLE}((:|=)\s*).*$%${VARIABLE}\1${VALUE}%g" ${APPLICATION_PROPERTIES_FILE} >${APPLICATION_PROPERTIES_FILE}-AUX
    compareFiles $APPLICATION_PROPERTIES_FILE $VARIABLE $VALUE
fi

# -------------
# Wait for NPM dependency to be available
# -------------
if [[ "${WAIT_FOR_NPM_DEPENDENCY}" == true ]]; then
    CHECK_VERSION_AVAILABILTY="npm show ${DEPENDENCY}@${VERSION} version || echo ''"
    VERSION_AUX=$(eval "${CHECK_VERSION_AVAILABILTY}")
    until [[ "${VERSION_AUX}" == "${VERSION}" ]]; do
        echo "Waiting for ${DEPENDENCY}@${VERSION} to be available in NPM..."
        sleep 2
        VERSION_AUX=$(eval "${CHECK_VERSION_AVAILABILTY}")
    done
    echo "${DEPENDENCY}@${VERSION} already available in NPM"
    popd
fi
