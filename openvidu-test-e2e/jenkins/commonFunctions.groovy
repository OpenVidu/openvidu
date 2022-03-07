#!groovy
def prepareTestingEnvironment() {
    println('Cleaning environment')
    parallel (
        'Deleting folder /opt/openvidu and create permissions': {
            sh 'sudo rm -rf /opt/openvidu/* || true'
            sh 'sudo mkdir -p /opt/openvidu/recordings && sudo chmod 777 /opt/openvidu/recordings'
        },
        'Deleting repository openvidu': {
            sh 'sudo rm -rf openvidu || true'
        },
        'Deleting repository openvidu-pro': {
            sh 'sudo rm -rf openvidu-pro || true'
        },
        'Deleting repository replication-manager': {
            sh 'sudo rm -rf replication-manager || true'
        },
        'Deleting repository kurento-java': {
            sh 'sudo rm -rf kurento-java || true'
        },
        'Deleting openvidu .m2 dependencies': {
            sh 'sudo rm -rf /opt/openvidu-cache/.m2/repository/io/openvidu || true'
        },
        'Deleting kurento .m2 dependencies': {
            sh 'sudo rm -rf /opt/openvidu-cache/.m2/repository/org/kurento || true'
        },
        'Removing stranded containers': {
            removeStrandedContainers(true)
        },
    )

    println('Pulling containers and downloading files')
    parallel (
        'Pull openvidu/openvidu-test-e2e': {
            if (env.DISTRO) {
                docker.image("openvidu/openvidu-test-e2e:${DISTRO}").pull()
            }
        },
        'Pull openvidu/openvidu-pro-test-e2e': {
            if (env.DISTRO) {
                docker.image("openvidu/openvidu-pro-test-e2e:${DISTRO}").pull()
            }
        },
        'Pull selenium/standalone-chrome': {
            if (env.CHROME_VERSION) {
                docker.image("selenium/standalone-chrome:${CHROME_VERSION}").pull()
            } else {
                docker.image('selenium/standalone-chrome:latest').pull()
            }
        },
        'Pull selenium/standalone-firefox': {
            if (env.FIREFOX_VERSION) {
                docker.image("selenium/standalone-firefox:${FIREFOX_VERSION}").pull()
            } else {
                docker.image('selenium/standalone-firefox:latest').pull()
            }
        },
        'Pull selenium/standalone-opera': {
            if (env.OPERA_VERSION) {
                docker.image("selenium/standalone-opera:${OPERA_VERSION}").pull()
            } else {
                docker.image('selenium/standalone-opera:latest').pull()
            }
        },
        'Pull selenium/standalone-edge': {
            if (env.EDGE_VERSION) {
                docker.image("selenium/standalone-edge:${EDGE_VERSION}").pull()
            } else {
                docker.image('selenium/standalone-edge:latest').pull()
            }
        },
        'Pull budtmo/docker-android-x86-12.0': {
            docker.image('budtmo/docker-android-x86-12.0:latest').pull()
        },
        'Pull openvidu/mediasoup-controller': {
            if (env.MEDIASOUP_CONTROLLER_VERSION) {
                docker.image("openvidu/mediasoup-controller:${MEDIASOUP_CONTROLLER_VERSION}").pull()
            }
        },
        'Pull kurento/kurento-media-server': {
            if (env.KURENTO_MEDIA_SERVER_VERSION) {
                docker.image("kurento/kurento-media-server:${KURENTO_MEDIA_SERVER_VERSION}").pull()
            }
        },
        'Download fake video': {
            sh(script: '''#!/bin/bash -xe
                FAKE_VIDEO=/opt/openvidu-cache/barcode.y4m
                if [ ! -f ${FAKE_VIDEO} ]; then
                    sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/barcode.y4m --create-dirs --output /opt/openvidu-cache/barcode.y4m
                else
                    echo "File ${FAKE_VIDEO} already exists"
                fi
                sudo cp /opt/openvidu-cache/barcode.y4m /opt/openvidu/barcode.y4m
            '''.stripIndent())
        },
        'Download fake audio': {
            sh(script: '''#!/bin/bash -xe
                FAKE_AUDIO=/opt/openvidu-cache/fakeaudio.wav
                if [ ! -f ${FAKE_AUDIO} ]; then
                    sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/fakeaudio.wav --create-dirs --output /opt/openvidu-cache/fakeaudio.wav
                else
                    echo "File ${FAKE_AUDIO} already exists"
                fi
                sudo cp /opt/openvidu-cache/barcode.y4m /opt/openvidu/fakeaudio.wav
            '''.stripIndent())
        },
        'Download custom layout': {
            sh 'sudo curl --location https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-test-e2e/docker/my-custom-layout/index.html --create-dirs --output /opt/openvidu-cache/test-layouts/layout1/index.html'
        }
    )
}

def removeStrandedContainers(removeTestingContainers) {
    println('Removing stranded containers')
    script {
        env.removeTestingContainers = removeTestingContainers
        sh(script: '''#!/bin/bash -xe
            declare -a arr=("selenium/standalone-chrome:"
                            "selenium/standalone-firefox:"
                            "selenium/standalone-opera:"
                            "selenium/standalone-edge:"
                            "budtmo/docker-android"
                            "openvidu/mediasoup-controller:"
                            "openvidu/openvidu-server-pro:"
                            "openvidu/openvidu-redis:"
                            "openvidu/openvidu-coturn:"
                            "openvidu/openvidu-proxy:"
                            "openvidu/replication-manager:"
                            "docker.elastic.co/elasticsearch/elasticsearch:"
                            "docker.elastic.co/kibana/kibana:"
                            "docker.elastic.co/beats/metricbeat-oss:"
                            "docker.elastic.co/beats/filebeat-oss:"
                            "openvidu/openvidu-pro-dind-media-node:"
                            "kurento/kurento-media-server:"
                            "openvidu/media-node-controller:")
            if [ "${removeTestingContainers}" == "true" ]; then
                arr+=("openvidu/openvidu-test-e2e:")
                arr+=("openvidu/openvidu-pro-test-e2e:")
            fi
            for image in "${arr[@]}"
            do
                docker ps -a | awk '{ print $1,$2 }' | grep "${image}" | awk '{ print $1 }' | xargs -I {} docker rm -f {} || true
            done
            docker ps -a
        '''.stripIndent())
    }
}

def storeFolderInCache(folderToStore, cacheDestiny) {
    script {
        env.folderToStore = folderToStore
        env.cacheDestiny = cacheDestiny
        sh(script: '''#!/bin/bash -xe
            if [[ (-d ${folderToStore}) && ("$(ls -A ${folderToStore})") ]]; then
                echo "Storing in cache"
                sudo mkdir -p ${cacheDestiny}
                sudo mv ${folderToStore}/* ${cacheDestiny}
            else
                echo "Folder to store in cache does not exist or is empty"
            fi
        '''.stripIndent())
    }
}

def loadFolderFromCache(cacheFolder, destinyFolder) {
    script {
        env.cacheFolder = cacheFolder
        env.destinyFolder = destinyFolder
        sh(script: '''#!/bin/bash -xe
            if [[ (-d ${cacheFolder}) && ("$(ls -A ${cacheFolder})") ]]; then
                echo "Loading from cache"
                sudo mkdir -p ${destinyFolder}
                sudo mv ${cacheFolder}/* ${destinyFolder}
                sudo chown -R 1000:1000 ${destinyFolder} && sudo chmod 777 ${destinyFolder}
            else
                echo "Cache folder does not exist or is empty"
            fi
        '''.stripIndent())
    }
}

return this
