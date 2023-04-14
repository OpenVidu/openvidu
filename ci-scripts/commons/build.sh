#!/bin/bash -x
set -eu -o pipefail

############################################################################
# Any function offered by this file that is not path agnostic assumes that #
# the path is located where the first command of each function requires it #
############################################################################

CLEAN_ENVIRONMENT=false
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

if [[ -n ${1:-} ]]; then
    case "${1:-}" in

    --clean-environment)
        CLEAN_ENVIRONMENT=true
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
        if [[ -z "${2:-}" ]]; then
            echo "Must provide LINK_LOCAL_DEPENDENCIES as 1st parameter"
            exit 1
        fi
        BUILD_OV_SERVER_DASHBOARD=true
        LINK_LOCAL_DEPENDENCIES="${2}"
        ;;

    --build-openvidu-server)
        BUILD_OV_SERVER=true
        ;;

    --build-openvidu-server-dependency)
        BUILD_OV_SERVER_DEPENDENCY=true
        ;;

    --build-openvidu-server-pro-inspector)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide LINK_LOCAL_DEPENDENCIES as 1st parameter"
            exit 1
        fi
        BUILD_OV_SERVER_PRO_INSPECTOR=true
        LINK_LOCAL_DEPENDENCIES="${2}"
        ;;

    --build-openvidu-server-pro)
        BUILD_OV_SERVER_PRO=true
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
# Clean environment
# -------------
if [[ "${CLEAN_ENVIRONMENT}" == true ]]; then

    # Remove all running containers except test container and runner container
    ids=$(docker ps -a -q)
    for id in $ids; do
        DOCKER_IMAGE=$(docker inspect --format='{{.Config.Image}}' $id)
        if [[ "${DOCKER_IMAGE}" != *"$TEST_IMAGE"* ]] &&
            [[ "${DOCKER_IMAGE}" != *"runner-image"* ]]; then
            echo "Removing container image '$DOCKER_IMAGE' with id '$id'"
            docker stop $id && docker rm $id
        fi
    done

    # Clean /opt/openvidu contents
    rm -rf /opt/openvidu/*

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
    npm run browserify
    npm run browserify-prod
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
    MVN_VERSION=$(mvn -q -Dexec.executable=echo -Dexec.args='${project.version}' --non-recursive exec:exec)
    mvn -B clean compile package
    mvn -B install:install-file -Dfile=target/openvidu-java-client-${MVN_VERSION}.jar \
        -DgroupId=io.openvidu \
        -DartifactId=openvidu-java-client \
        -Dversion=${MVN_VERSION} -Dpackaging=jar
    popd
fi

# -------------
# Build openvidu-parent
# -------------
if [[ "${BUILD_OV_PARENT}" == true ]]; then
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
    if [[ "${LINK_LOCAL_DEPENDENCIES}" == true ]]; then
        npm link openvidu-browser openvidu-node-client
    fi
    npm run build-prod
    popd
fi

# -------------
# Build openvidu-server
# -------------
if [[ "${BUILD_OV_SERVER}" == true ]]; then
    pushd openvidu-server
    mvn -B -DskipTests=true clean package
    mv target/openvidu-server-*.jar /opt/openvidu
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
    if [[ "${LINK_LOCAL_DEPENDENCIES}" == true ]]; then
        npm link openvidu-browser openvidu-node-client
    fi
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
