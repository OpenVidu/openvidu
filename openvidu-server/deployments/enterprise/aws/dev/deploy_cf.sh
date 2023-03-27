#!/bin/bash -x
set -eu -o pipefail

export AWS_DEFAULT_REGION=eu-west-1

fatal_error() {
    printf "\n     =======¡ERROR!======="
    printf "\n     %s" "$1"
    printf "\n"
    exit 1
}

TIMESTAMP=$(date +%s)

[[ -n "${DEPLOY_ELASTICSEARCH_AWS}" ]] || DEPLOY_ELASTICSEARCH_AWS=false

# Check all required variables
[[ -n "${OPENVIDU_LICENSE}" ]] || fatal_error "OPENVIDU_LICENSE must be defined"
[[ -n "${SSH_KEY_NAME}" ]] || fatal_error "SSH_KEY_NAME must be defined"
[[ -n "${VPC}" ]] || fatal_error "VPC must be defined"
[[ -n "${SUBNETS}" ]] || fatal_error "SUBNETS must be defined"
[[ -n "${LOAD_BALANCER_CERTIFICATE}" ]] || fatal_error "LOAD_BALANCER_CERTIFICATE must be defined"
[[ -n "${AWS_ACCOUNT_ID}" ]] || fatal_error "AWS_ACCOUNT_ID must be defined"

# Check variables with default values
[[ -n "${OPENVIDU_PRO_CLUSTER_ID:-}" ]] || OPENVIDU_PRO_CLUSTER_ID="ov-pro-multimaster-${TIMESTAMP}"
[[ -n "${OPENVIDU_SECRET:-}" ]] || OPENVIDU_SECRET="MY_SECRET"
[[ -n "${ELASTICSEARCH_USERNAME:-}" ]] || ELASTICSEARCH_USERNAME="elasticadmin"
[[ -n "${ELASTICSEARCH_PASSWORD:-}" ]] || ELASTICSEARCH_PASSWORD="My_Secret_123"
[[ -n "${MASTER_NODE_INSTANCE_TYPE:-}" ]] || MASTER_NODE_INSTANCE_TYPE="t2.large"
[[ -n "${MEDIA_NODE_INSTANCE_TYPE:-}" ]] || MEDIA_NODE_INSTANCE_TYPE="t2.large"


# Start elasticsearch
TEMP_JSON_ES_CONF=$(mktemp -t es-conf-XXX --suffix .json)
cat > "$TEMP_JSON_ES_CONF"<<EOF
{
  "InstanceType": "t3.medium.elasticsearch",
  "InstanceCount": 1,
  "DedicatedMasterEnabled": false,
  "ZoneAwarenessEnabled": false,
  "WarmEnabled": false
}
EOF

TEMP_JSON_ES_EBS_OPT=$(mktemp -t es-ebs-XXX --suffix .json)
cat > "$TEMP_JSON_ES_EBS_OPT"<<EOF
{
  "EBSEnabled": true,
  "VolumeType": "gp2",
  "VolumeSize": 10
}
EOF

TEMP_ACCESS_POLICY=$(mktemp -t es-acl-XXX --suffix .json)
cat > "$TEMP_ACCESS_POLICY"<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "${AWS_ACCOUNT_ID}:domain/ov-elasticsearch-${TIMESTAMP}/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": ["0.0.0.0/0", "::/0"]
        }
      }
    }
  ]
}
EOF

TEMP_MASTER_USER=$(mktemp -t es-user-XXX --suffix .json)
cat > "$TEMP_MASTER_USER"<<EOF
{
  "Enabled": true,
  "InternalUserDatabaseEnabled": true,
  "MasterUserOptions": {
    "MasterUserName": "${ELASTICSEARCH_USERNAME}",
    "MasterUserPassword": "${ELASTICSEARCH_PASSWORD}"
  }
}
EOF

if [[ "${DEPLOY_ELASTICSEARCH_AWS}" == "true" ]] && [[ -z "${ELASTICSEARCH_HOST}" ]] && [[ -z "${KIBANA_HOST}" ]]; then
  aws es create-elasticsearch-domain --domain-name "ov-elasticsearch-${TIMESTAMP}" \
    --domain-endpoint-options EnforceHTTPS=true \
    --elasticsearch-version 7.10 \
    --elasticsearch-cluster-config file:///"${TEMP_JSON_ES_CONF}" \
    --ebs-options file:///"${TEMP_JSON_ES_EBS_OPT}" \
    --access-policies file:///"${TEMP_ACCESS_POLICY}" \
    --advanced-security-options file://"${TEMP_MASTER_USER}" \
    --node-to-node-encryption-options Enabled=true \
    --encryption-at-rest-options Enabled=true

    # Wait for elasticsearch
    MAX_SECONDS_WAITING=2000
    CURRENT_SECONDS=0
    until [ "${CURRENT_SECONDS}" -ge "${MAX_SECONDS_WAITING}" ]
    do
      echo "Waiting for elasticsearch to be deployed..."
      ELASTICSEARCH_ENDPOINT=$(aws es describe-elasticsearch-domain --domain-name "ov-elasticsearch-${TIMESTAMP}" | jq -r .DomainStatus.Endpoint)
      if [[ "${ELASTICSEARCH_ENDPOINT}" != null ]]; then
        break
      fi
      CURRENT_SECONDS=$((CURRENT_SECONDS+5))
      sleep 5
    done

    if [[ "${ELASTICSEARCH_ENDPOINT}" == "null" ]]; then
      fatal_error "Elasticsearch was not started correctly"
    else
      ELASTICSEARCH_HOST="https://${ELASTICSEARCH_ENDPOINT}:443"
      KIBANA_HOST="https://${ELASTICSEARCH_ENDPOINT}:443/_plugin/kibana/"
    fi
fi



TEMPJSON=$(mktemp -t cloudformation-XXX --suffix .json)

cat > "$TEMPJSON"<<EOF
  [
    {"ParameterKey":"DomainName","ParameterValue":"${DOMAIN_NAME}"},
    {"ParameterKey":"KeyName","ParameterValue":"${SSH_KEY_NAME}"},
    {"ParameterKey":"OpenViduLicense","ParameterValue":"${OPENVIDU_LICENSE}"},
    {"ParameterKey":"OpenViduSecret","ParameterValue":"${OPENVIDU_SECRET}"},
    {"ParameterKey":"MediaServer","ParameterValue":"mediasoup"},
    {"ParameterKey":"OpenViduProClusterId","ParameterValue":"${OPENVIDU_PRO_CLUSTER_ID}"},
    {"ParameterKey":"ElasticsearchUrl","ParameterValue":"${ELASTICSEARCH_HOST}"},
    {"ParameterKey":"KibanaUrl","ParameterValue":"${KIBANA_HOST}"},
    {"ParameterKey":"ElasticsearchUser","ParameterValue":"${ELASTICSEARCH_USERNAME}"},
    {"ParameterKey":"ElasticsearchPassword","ParameterValue":"${ELASTICSEARCH_PASSWORD}"},
    {"ParameterKey":"LoadBalancerCertificateARN","ParameterValue":"${LOAD_BALANCER_CERTIFICATE}"},
    {"ParameterKey":"AwsInstanceTypeOV","ParameterValue":"${MASTER_NODE_INSTANCE_TYPE}"},
    {"ParameterKey":"AwsInstanceTypeKMS","ParameterValue":"${MEDIA_NODE_INSTANCE_TYPE}"},
    {"ParameterKey":"OpenViduVPC","ParameterValue":"${VPC}"},
    {"ParameterKey":"OpenViduSubnets","ParameterValue":"${SUBNETS}"}
  ]
EOF

cat "$TEMPJSON"
KMS_AMI_ID="$(aws ec2 describe-images --filters Name=image-type,Values=machine Name=is-public,Values=false \
    --query 'Images[?starts_with(Name, `KMS-ov-master`) == `true`][CreationDate, Name, ImageId, Public]' \
    --output text | sort -r -k1 | head -n1 | awk '{ print $3 }')"
OV_AMI_ID="$(aws ec2 describe-images --filters Name=image-type,Values=machine Name=is-public,Values=false \
--query 'Images[?starts_with(Name, `OpenViduServerProASG-master-dev`) == `true`][CreationDate, Name, ImageId, Public]' \
--output text | sort -r -k1 | head -n1 | awk '{ print $3 }')"

sed -i "s/KMS_AMI_ID/${KMS_AMI_ID}/g" CF-OpenVidu-Enterprise-dev-master.yaml
sed -i "s/OV_MASTER_REPLICATION_AMI_ID/${OV_AMI_ID}/g" CF-OpenVidu-Enterprise-dev-master.yaml

CF_FILE="https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/CF-OpenVidu-Enterprise-dev-master.yaml"
aws s3 cp CF-OpenVidu-Enterprise-dev-master.yaml s3://aws.openvidu.io --acl public-read

echo "Starting Multimaster cloudformation"
aws cloudformation create-stack \
  --template-url "${CF_FILE}" \
  --stack-name "${OPENVIDU_PRO_CLUSTER_ID}" \
  --parameters file:///"${TEMPJSON}" \
  --disable-rollback \
  --capabilities CAPABILITY_IAM \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --stack-name "${OPENVIDU_PRO_CLUSTER_ID}"
