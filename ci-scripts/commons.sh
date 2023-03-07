#!/bin/bash -x
set -eu -o pipefail

# CI flags
GITHUB_ACTIONS_ORIGINAL_WORKING_DIR="${PWD}"
GITHUB_ACTIONS_WORKING_DIR="${GITHUB_ACTIONS_WORKING_DIR:-}"

PREPARE=false
TEST_IMAGE="openvidu/openvidu-test-e2e"

CLEAN_ENVIRONMENT=false
PREPARE_KURENTO_SNAPSHOT=false
EXECUTE_ALL=false
SERVE_OV_TESTAPP=false

# Build artifacts
BUILD_OV_BROWSER=false
BUILD_OV_NODE_CLIENT=false
BUILD_OV_JAVA_CLIENT=false
BUILD_OV_PARENT=false
BUILD_OV_TESTAPP=false

# Bump versions
BUMP_NPM_PROJECT_VERSION=false
BUMP_NPM_DEPENDENCY_VERSION=false
BUMP_MAVEN_PROJECT_VERSION=false
BUMP_MAVEN_PROPERTY_VERSION=false
BUMP_DOCKER_COMPOSE_SERVICE_VERSION=false
BUMP_DOCKER_COMPOSE_HEADER_VERSION=false
BUMP_DOCKER_IMAGE_VERSION_IN_FILES=false

WAIT_FOR_NPM_DEPENDENCY=false

# cd to directory if GITHUB_ACTIONS_WORKING_DIR is set
if [[ -n "${GITHUB_ACTIONS_WORKING_DIR:-}" ]]; then
    cd "${GITHUB_ACTIONS_WORKING_DIR}"
fi

# Environment variables
if [[ -n ${1:-} ]]; then
    while :; do
        case "${1:-}" in

        --clean-environment)
            CLEAN_ENVIRONMENT=true
            shift 1
            ;;

        --prepare)
            PREPARE=true
            if [[ -n "${2:-}" ]]; then
                TEST_IMAGE="${2}"
            fi
            shift 1
            ;;

        --prepare-kurento-snapshot)
            PREPARE_KURENTO_SNAPSHOT=true
            shift 1
            ;;

        --build-openvidu-browser)
            BUILD_OV_BROWSER=true
            shift 1
            ;;

        --build-openvidu-node-client)
            BUILD_OV_NODE_CLIENT=true
            shift 1
            ;;

        --build-openvidu-java-client)
            BUILD_OV_JAVA_CLIENT=true
            shift 1
            ;;

        --build-openvidu-parent)
            BUILD_OV_PARENT=true
            shift 1
            ;;

        --build-openvidu-testapp)
            BUILD_OV_TESTAPP=true
            shift 1
            ;;

        --serve-openvidu-testapp)
            SERVE_OV_TESTAPP=true
            shift 1
            ;;

        --bump-npm-project-version)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide PROJECT_PATH as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide VERSION as 2nd parameter" 1>&2
                exit 1
            fi
            BUMP_NPM_PROJECT_VERSION=true
            PROJECT_PATH="${2}"
            VERSION="${3}"
            shift 1
            ;;

        --bump-npm-dependency-version)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide PROJECT_PATH as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide DEPENDENCY as 2nd parameter" 1>&2
                exit 1
            fi
            if [[ -z "${4:-}" ]]; then
                echo "Must provide VERSION as 3rd parameter" 1>&2
                exit 1
            fi
            BUMP_NPM_DEPENDENCY_VERSION=true
            PROJECT_PATH="${2}"
            DEPENDENCY="${3}"
            VERSION="${4}"
            shift 1
            ;;

        --bump-maven-project-version)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide PROJECT_PATH as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide VERSION as 2nd parameter" 1>&2
                exit 1
            fi
            BUMP_MAVEN_PROJECT_VERSION=true
            PROJECT_PATH="${2}"
            VERSION="${3}"
            shift 1
            ;;

        --bump-maven-property-version)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide PROJECT_PATH as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide PROPERTY as 2nd parameter" 1>&2
                exit 1
            fi
            if [[ -z "${4:-}" ]]; then
                echo "Must provide VERSION as 3rd parameter" 1>&2
                exit 1
            fi
            BUMP_MAVEN_PROPERTY_VERSION=true
            PROJECT_PATH="${2}"
            PROPERTY="${3}"
            VERSION="${4}"
            shift 1
            ;;

        --bump-docker-compose-service-version)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide DOCKER_COMPOSE_FILE as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide SERVICE_IMAGE as 2nd parameter" 1>&2
                exit 1
            fi
            if [[ -z "${4:-}" ]]; then
                echo "Must provide VERSION as 3rd parameter" 1>&2
                exit 1
            fi
            BUMP_DOCKER_COMPOSE_SERVICE_VERSION=true
            DOCKER_COMPOSE_FILE="${2}"
            SERVICE_IMAGE="${3}"
            VERSION="${4}"
            shift 1
            ;;

        --bump-docker-compose-header-version)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide DOCKER_COMPOSE_FILE as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide HEADER as 2nd parameter" 1>&2
                exit 1
            fi
            if [[ -z "${4:-}" ]]; then
                echo "Must provide VERSION as 3rd parameter" 1>&2
                exit 1
            fi
            BUMP_DOCKER_COMPOSE_HEADER_VERSION=true
            DOCKER_COMPOSE_FILE="${2}"
            HEADER="${3}"
            VERSION="${4}"
            shift 1
            ;;

        --bump-docker-image-version-in-files)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide PROJECT_PATH as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide FILE_NAME as 2nd parameter" 1>&2
                exit 1
            fi
            if [[ -z "${4:-}" ]]; then
                echo "Must provide IMAGE as 3rd parameter" 1>&2
                exit 1
            fi
            if [[ -z "${4:-}" ]]; then
                echo "Must provide VERSION as 4th parameter" 1>&2
                exit 1
            fi
            BUMP_DOCKER_IMAGE_VERSION_IN_FILES=true
            PROJECT_PATH="${2}"
            FILE_NAME="${3}"
            IMAGE="${4}"
            VERSION="${5}"
            shift 1
            ;;

        --wait-for-npm-dependency)
            if [[ -z "${2:-}" ]]; then
                echo "Must provide DEPENDENCY as 1st parameter" 1>&2
                exit 1
            fi
            if [[ -z "${3:-}" ]]; then
                echo "Must provide VERSION as 2nd parameter" 1>&2
                exit 1
            fi
            WAIT_FOR_NPM_DEPENDENCY=true
            DEPENDENCY="${2}"
            VERSION="${3}"
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
if [[ "${PREPARE}" == true || "${EXECUTE_ALL}" == true ]]; then

    # Connect e2e test container to network bridge so it is vissible for browser and media server containers
    E2E_CONTAINER_ID="$(docker ps | grep "${TEST_IMAGE}":* | awk '{ print $1 }')"

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
    http-server -S -p 4200 &>/opt/openvidu/testapp.log &
    popd
fi

# -------------
# Bump NPM project version
# -------------
if [[ "${BUMP_NPM_PROJECT_VERSION}" == true ]]; then
    pushd ${PROJECT_PATH}
    npm version ${VERSION} --git-tag-version=false --commit-hooks=false
    popd
fi

# -------------
# Bump NPM project dependency
# -------------
if [[ "${BUMP_NPM_DEPENDENCY_VERSION}" == true ]]; then
    pushd ${PROJECT_PATH}
    tmp=$(mktemp) && jq -j ".dependencies.\"${DEPENDENCY}\" = \"${VERSION}\"" package.json >"$tmp" && mv "$tmp" package.json
    # npm install "${DEPENDENCY}@${VERSION}" --save-exact=true --legacy-peer-deps
    popd
fi

# -------------
# Bump Maven project version
# -------------
if [[ "${BUMP_MAVEN_PROJECT_VERSION}" == true ]]; then
    pushd ${PROJECT_PATH}
    mvn -DskipTests=true versions:set -DnewVersion="${VERSION}"
    popd
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

    pushd ${PROJECT_PATH}
    mvn --batch-mode \
        --settings /tmp/maven-generic-settings/settings.xml \
        -DskipTests=true \
        versions:set-property \
        -Dproperty="${PROPERTY}" \
        -DnewVersion="${VERSION}"
    popd
fi

# -------------
# Bump docker-compose.yml service version
# -------------
if [[ "${BUMP_DOCKER_COMPOSE_SERVICE_VERSION}" == true ]]; then
    sed "s|image:\s\+${SERVICE_IMAGE}:[[:alnum:]\._-]\+|image: ${SERVICE_IMAGE}:${VERSION}|g" ${DOCKER_COMPOSE_FILE} >${DOCKER_COMPOSE_FILE}-AUX
    if cmp -s "${DOCKER_COMPOSE_FILE}" "${DOCKER_COMPOSE_FILE}-AUX"; then
        rm -f ${DOCKER_COMPOSE_FILE}-AUX
        echo "Error: no changes has been made to $DOCKER_COMPOSE_FILE"
        echo "Trying to change service image \"${SERVICE_IMAGE}\" to version \"${VERSION}\""
        exit 1
    else
        rm -f ${DOCKER_COMPOSE_FILE}-AUX
        sed -i "s|image:\s\+${SERVICE_IMAGE}:[[:alnum:]\._-]\+|image: ${SERVICE_IMAGE}:${VERSION}|g" ${DOCKER_COMPOSE_FILE}
    fi
fi

# -------------
# Bump docker-compose.yml header version
# -------------
if [[ "${BUMP_DOCKER_COMPOSE_HEADER_VERSION}" == true ]]; then
    sed "s|#\s\+${HEADER}:\s\+[[:alnum:]\._-]\+|#    ${HEADER}: ${VERSION}|g" ${DOCKER_COMPOSE_FILE} >${DOCKER_COMPOSE_FILE}-AUX
    if cmp -s "${DOCKER_COMPOSE_FILE}" "${DOCKER_COMPOSE_FILE}-AUX"; then
        rm -f ${DOCKER_COMPOSE_FILE}-AUX
        echo "Error: no changes has been made to $DOCKER_COMPOSE_FILE"
        echo "Trying to change header \"${HEADER}\" to version \"${VERSION}\""
        exit 1
    else
        rm -f ${DOCKER_COMPOSE_FILE}-AUX
        sed -i "s|#\s\+${HEADER}:\s\+[[:alnum:]\._-]\+|#    ${HEADER}: ${VERSION}|g" ${DOCKER_COMPOSE_FILE}
    fi
fi

# -------------
# Bump Docker image version in files
# -------------
if [[ "${BUMP_DOCKER_IMAGE_VERSION_IN_FILES}" == true ]]; then
    pushd ${PROJECT_PATH}
    find . -type f -name ${FILE_NAME} | xargs sed -i "s|${IMAGE}:[[:alnum:]\._-]\+|${IMAGE}:${VERSION}|g"
    popd
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
