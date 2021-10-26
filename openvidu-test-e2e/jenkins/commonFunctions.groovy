#!groovy
def prepareTestingEnvironment(def DISTRO, def MEDIASOUP_CONTROLLER_DOCKER_VERSION) {
    println('Deleting folder /opt/openvidu')
    sh 'sudo rm -rf /opt/openvidu/* || true'

    println('Deleting repositories')
    sh 'sudo rm -rf openvidu || true'
    sh 'sudo rm -rf openvidu-pro || true'
    sh 'sudo rm -rf kurento-java || true'

    println('Deleting OpenVidu related .m2 dependencies')
    sh 'sudo rm -rf /opt/openvidu-cache/.m2/repository/io/openvidu || true'
    sh 'sudo rm -rf /opt/openvidu-cache/.m2/repository/org/kurento || true'

    println('Removing stranded containers')
    sh(script: '''#!/bin/bash -xe
        declare -a arr=('openvidu/openvidu-test-e2e:',
                        'openvidu/openvidu-pro-test-e2e:',
                        'selenium/standalone-chrome:',
                        'selenium/standalone-firefox:',
                        'selenium/standalone-opera:',
                        'openvidu/mediasoup-controller:',
                        'openvidu/openvidu-server-pro:',
                        'openvidu/openvidu-redis:',
                        'openvidu/openvidu-coturn:',
                        'openvidu/openvidu-proxy:',
                        'openvidu/replication-manager:',
                        'docker.elastic.co/elasticsearch/elasticsearch:',
                        'docker.elastic.co/kibana/kibana:',
                        'docker.elastic.co/beats/metricbeat-oss:',
                        'docker.elastic.co/beats/filebeat-oss:',
                        'openvidu/openvidu-pro-dind-media-node:',
                        'kurento/kurento-media-server:',
                        'openvidu/media-node-controller:')
        for image in "${containersToRemove[@]}"
        do
            docker ps -a | awk \'{ print $1,$2 }\' | grep "$image" | awk \'{ print $1 }\' | xargs -I {} docker rm -f {}
        done
    '''.stripIndent())

    println('Pulling containers')
    parallel (
        'Pull openvidu/openvidu-test-e2e': {
            docker.image('openvidu/openvidu-test-e2e:$DISTRO').pull()
        },
        'Pull openvidu/openvidu-pro-test-e2e': {
            docker.image('openvidu/openvidu-pro-test-e2e:$DISTRO').pull()
        },
        'Pull selenium/standalone-chrome': {
            docker.image('selenium/standalone-chrome:latest').pull()
        },
        'Pull selenium/standalone-firefox': {
            docker.image('selenium/standalone-firefox:latest').pull()
        },
        'Pull selenium/standalone-opera': {
            docker.image('selenium/standalone-opera:latest').pull()
        },
        'Pull openvidu/mediasoup-controller': {
            docker.image('openvidu/mediasoup-controller:$MEDIASOUP_CONTROLLER_DOCKER_VERSION').pull()
        }
    )

    println('Downloading files')
    parallel (
        'Download fake video': {
            sh(script: '''#!/bin/bash -xe
                FAKE_VIDEO=/opt/openvidu-cache/barcode.y4m
                if [ ! -f $FAKE_VIDEO ]; then
                    sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/barcode.y4m --create-dirs --output /opt/openvidu-cache/barcode.y4m
                else
                    echo "File $FAKE_VIDEO already exists"
                fi
                sudo cp /opt/openvidu-cache/barcode.y4m /opt/openvidu/barcode.y4m
            '''.stripIndent())
        },
        'Download fake audio': {
            sh(script: '''#!/bin/bash -xe
                FAKE_AUDIO=/opt/openvidu-cache/fakeaudio.wav
                if [ ! -f $FAKE_AUDIO ]; then
                    sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/fakeaudio.wav --create-dirs --output /opt/openvidu-cache/fakeaudio.wav
                else
                    echo "File $FAKE_AUDIO already exists"
                fi
                sudo cp /opt/openvidu-cache/barcode.y4m /opt/openvidu/fakeaudio.wav
            '''.stripIndent())
        },
        'Download custom layout': {
            sh 'sudo curl --location https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-test-e2e/docker/my-custom-layout/index.html --create-dirs --output /opt/openvidu-cache/test-layouts/layout1/index.html'
        }
    )
}

return this
