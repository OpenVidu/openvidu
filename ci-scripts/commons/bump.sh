#!/bin/bash -x
set -eu -o pipefail

############################################################################
# Any function offered by this file that is not path agnostic assumes that #
# the path is located where the first command of each function requires it #
############################################################################

# Bump versions
BUMP_NPM_PROJECT_VERSION=false
BUMP_NPM_DEPENDENCY_VERSION=false
BUMP_MAVEN_PROJECT_VERSION=false
BUMP_MAVEN_PROPERTY_VERSION=false
BUMP_MAVEN_DEPENDENCY_VERSION=false
BUMP_DOCKER_COMPOSE_SERVICE_VERSION=false
BUMP_DOCKER_COMPOSE_HEADER_VERSION=false
BUMP_DOCKER_IMAGE_VERSION_IN_FILES=false
BUMP_APPLICATION_PROPERTIES_VAR_VALUE=false
WAIT_FOR_NPM_DEPENDENCY=false
GENERIC_SED=false

if [[ -n ${1:-} ]]; then
    case "${1:-}" in

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
        TYPE_OF_DEPENDENCY="${4:-dependencies}" # [dependencies, devDependencies, peerDependencies, optionalDependencies]
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

    --bump-maven-dependency-version)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide DEPENDENCY as 1st parameter"
            exit 1
        fi
        if [[ -z "${3:-}" ]]; then
            echo "Must provide VERSION as 2nd parameter"
            exit 1
        fi
        BUMP_MAVEN_DEPENDENCY_VERSION=true
        DEPENDENCY="${2}"
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

    --generic-sed)
        if [[ -z "${2:-}" ]]; then
            echo "Must provide FILE as 1st parameter"
            exit 1
        fi
        if [[ -z "${3:-}" ]]; then
            echo "Must provide SED_EXPRESSION as 2nd parameter"
            exit 1
        fi
        GENERIC_SED=true
        FILE="${2}"
        SED_EXPRESSION="${3}"
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
# Bump NPM project version
# -------------
if [[ "${BUMP_NPM_PROJECT_VERSION}" == true ]]; then
    npm version ${VERSION} --git-tag-version=false --commit-hooks=false
fi

# -------------
# Bump NPM project dependency
# -------------
if [[ "${BUMP_NPM_DEPENDENCY_VERSION}" == true ]]; then
    jq -j ".${TYPE_OF_DEPENDENCY}.\"${DEPENDENCY}\" = \"${VERSION}\"" package.json >package.json-AUX
    compareFiles package.json version $VERSION
fi

# -------------
# Bump Maven project version
# -------------
if [[ "${BUMP_MAVEN_PROJECT_VERSION}" == true ]]; then
    cp pom.xml pom.xml-AUX
    mvn -DskipTests=true versions:set -DnewVersion="${VERSION}"
    mv pom.xml changed-pom.xml && mv pom.xml-AUX pom.xml && mv changed-pom.xml pom.xml-AUX
    compareFiles pom.xml "<version>" $VERSION
fi

# -------------
# Bump Maven project property
# -------------
if [[ "${BUMP_MAVEN_PROPERTY_VERSION}" == true ]]; then

    MVN_SETTINGS_FLAG=""

    if [[ -n "${OPENVIDU_MAVEN_GENERIC_SETTINGS:-}" ]]; then
        # Config file with Kurento Snapshots configuration only
        mkdir -p /tmp/maven-generic-settings
        echo "${OPENVIDU_MAVEN_GENERIC_SETTINGS}" >/tmp/maven-generic-settings/settings.xml
        MVN_SETTINGS_FLAG='--settings /tmp/maven-generic-settings/settings.xml'
    fi

    mvn --batch-mode $MVN_SETTINGS_FLAG \
        -DskipTests=true \
        versions:set-property \
        -Dproperty="${PROPERTY}" \
        -DnewVersion="${VERSION}"
fi

# -------------
# Bump Maven dependency property
# -------------
if [[ "${BUMP_MAVEN_DEPENDENCY_VERSION}" == true ]]; then
    mvn --batch-mode versions:use-dep-version -Dincludes=$DEPENDENCY -DdepVersion=$VERSION -DforceVersion=true
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
fi

# -------------
# Generic sed replacement
# -------------
if [[ "${GENERIC_SED}" == true ]]; then
    sed -r "$SED_EXPRESSION" ${FILE} >${FILE}-AUX
    compareFiles $FILE "(generic sed)" "$SED_EXPRESSION"
fi
