#!/bin/bash -x
set -eu -o pipefail

# Testing deployment of OpenVidu Server on AWS

# VARS
DOMAIN_NAME=$(pwgen -A -0 10 1)
TEMPFILE=$(mktemp -t file-XXX --suffix .json)
TEMPJSON=$(mktemp -t cloudformation-XXX --suffix .json)
TEMPLATE_FILENAME=$(ls -1 cfn-openvidu-server-pro-no-market-*.yaml  )
export AWS_DEFAULT_REGION=eu-west-1

aws s3 cp ${TEMPLATE_FILENAME} s3://aws.openvidu.io/cfn-openvidu-server-pro-no-market-dev.yaml # --acl public-read

CF_FILE="https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/cfn-openvidu-server-pro-no-market-dev.yaml"

cat > $TEMPJSON<<EOF
  [
    {"ParameterKey":"KeyName","ParameterValue":"nordri-aws-urjc"},
    {"ParameterKey":"MyDomainName","ParameterValue":"openvidu.mycompany.com"},
    {"ParameterKey":"PublicElasticIP","ParameterValue":"1.0.2.0"},
    {"ParameterKey":"OpenViduSecret","ParameterValue":"MY_SECRET"},
    {"ParameterKey":"KibanaUser","ParameterValue":"kibanaadmin"},
    {"ParameterKey":"KibanaPassword","ParameterValue":"MY_SECRET"},
    {"ParameterKey":"WhichCert","ParameterValue":"selfsigned"},
    {"ParameterKey":"LetsEncryptEmail","ParameterValue":"email@example.com"},
    {"ParameterKey":"OwnCertCRT","ParameterValue":"AAA"},
    {"ParameterKey":"OwnCertKEY","ParameterValue":"BBB"},
    {"ParameterKey":"FreeHTTPAccesToRecordingVideos","ParameterValue":"false"},
    {"ParameterKey":"OpenviduRecordingNotification","ParameterValue":"publisher_moderator"},
    {"ParameterKey":"OpenviduStreamsVideoMaxRecvBandwidth","ParameterValue":"0"},
    {"ParameterKey":"OpenviduStreamsVideoMinRecvBandwidth","ParameterValue":"0"},
    {"ParameterKey":"OpenviduStreamsVideoMaxSendBandwidth","ParameterValue":"0"},
    {"ParameterKey":"OpenviduStreamsVideoMinSendBandwidth","ParameterValue":"0"},
    {"ParameterKey":"OpenViduCidrBlock","ParameterValue":"172.16.0.0/16"},
    {"ParameterKey":"OpenViduSubnet","ParameterValue":"172.16.0.0/24"},
    {"ParameterKey":"OpenViduWebhook","ParameterValue":"false"},
    {"ParameterKey":"OpenViduWebhookEndpoint","ParameterValue":"http://54.154.208.234"},
    {"ParameterKey":"OpenViduWebhookHeaders","ParameterValue":"Authorization: Basic T1BFTlZJRFVBUFA6TVlfU0VDUkVU"},
    {"ParameterKey":"KurentoAvailabilityZone","ParameterValue":"eu-west-1a"}
  ]
EOF

aws cloudformation create-stack \
  --stack-name Openvidu-cluster-selfsigned-${DOMAIN_NAME} \
  --template-url ${CF_FILE} \
  --parameters file:///${TEMPJSON} \
  --disable-rollback \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --stack-name Openvidu-cluster-selfsigned-${DOMAIN_NAME}

echo "Extracting service URL..."
URL=$(aws cloudformation describe-stacks --stack-name Openvidu-cluster-selfsigned-${DOMAIN_NAME} | jq -r '.Stacks[0] | .Outputs[] | select(.OutputKey | contains("OpenViduInspector")) | .OutputValue')

echo "Checking app up and ready..."
RES=$(curl --insecure --location -u OPENVIDUAPP:MY_SECRET --output /dev/null --silent --write-out "%{http_code}\\n" ${URL} | grep "200" | uniq)

echo "Checking Kibana..."
KIBANA_URL=$(aws cloudformation describe-stacks --stack-name Openvidu-cluster-selfsigned-${DOMAIN_NAME} | jq -r '.Stacks[0] | .Outputs[] | select(.OutputKey | contains("Kibana")) | .OutputValue')
RES_KIBANA=$(curl --insecure --location -u kibanaadmin:MY_SECRET --output /dev/null --silent --write-out "%{http_code}\\n" ${KIBANA_URL} | grep "^200" | uniq)

if [ "$RES" != "200" ]; then
  echo "deployment failed"
  exit 1
fi

if [ "$RES_KIBANA" != "200" ]; then
  echo "Kibana failed"
  exit 1
fi
