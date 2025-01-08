#!/bin/bash -x
set -eu -o pipefail

if [[ -z "${1:-}" ]]; then
  echo "Must provide as 1st parameter an output file path to print the Media Node AMI id"
  exit 1
else
  OUTPUT_FILE="${1}"
fi

CF_RELEASE=${CF_RELEASE:-false}
AWS_KEY_NAME=${AWS_KEY_NAME:-}

if [[ $CF_RELEASE == "true" ]]; then
  git checkout v$OPENVIDU_PRO_VERSION
fi

export AWS_DEFAULT_REGION=eu-west-1

DATESTAMP=$(date +%s)
TEMPJSON=$(mktemp -t cloudformation-XXX --suffix .json)

# Get Latest Ubuntu AMI id from specified region
getUbuntuAmiId() {
  local AMI_ID=$(
    aws --region ${1} ec2 describe-images \
      --filters "Name=name,Values=*ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
                "Name=owner-alias,Values=amazon" \
      --query "sort_by(Images, &CreationDate)" |
      jq -r '.[-1].ImageId'
  )
  echo $AMI_ID
}

AMIEUWEST1=$(getUbuntuAmiId 'eu-west-1')
AMIUSEAST1=$(getUbuntuAmiId 'us-east-1')

# Copy templates to feed
cp cfn-mkt-kms-ami.yaml.template cfn-mkt-kms-ami.yaml
cp cfn-mkt-ov-ami.yaml.template cfn-mkt-ov-ami.yaml

## Setting Openvidu Version and Ubuntu Latest AMIs
if [[ ! -z ${AWS_KEY_NAME} ]]; then
  sed -i "s/      KeyName: AWS_KEY_NAME/      KeyName: ${AWS_KEY_NAME}/g" cfn-mkt-ov-ami.yaml
  sed -i "s/      KeyName: AWS_KEY_NAME/      KeyName: ${AWS_KEY_NAME}/g" cfn-mkt-kms-ami.yaml
else
  sed -i '/      KeyName: AWS_KEY_NAME/d' cfn-mkt-ov-ami.yaml
  sed -i '/      KeyName: AWS_KEY_NAME/d' cfn-mkt-kms-ami.yaml
fi
sed -i "s/AWS_KEY_NAME/${AWS_KEY_NAME}/g" cfn-mkt-ov-ami.yaml
sed -i "s/USE_MASTER_DOCKER_IMAGES/${USE_MASTER_DOCKER_IMAGES}/g" cfn-mkt-ov-ami.yaml
sed -i "s/OPENVIDU_VERSION/${OPENVIDU_PRO_VERSION}/g" cfn-mkt-ov-ami.yaml
sed -i "s/AWS_CLI_DOCKER_TAG/${AWS_CLI_DOCKER_TAG}/g" cfn-mkt-ov-ami.yaml
sed -i "s/OPENVIDU_RECORDING_DOCKER_TAG/${OPENVIDU_RECORDING_DOCKER_TAG}/g" cfn-mkt-ov-ami.yaml
sed -i "s/AMIEUWEST1/${AMIEUWEST1}/g" cfn-mkt-ov-ami.yaml
sed -i "s/AMIUSEAST1/${AMIUSEAST1}/g" cfn-mkt-ov-ami.yaml

sed -i "s/AWS_KEY_NAME/${AWS_KEY_NAME}/g" cfn-mkt-kms-ami.yaml
sed -i "s/USE_MASTER_DOCKER_IMAGES/${USE_MASTER_DOCKER_IMAGES}/g" cfn-mkt-kms-ami.yaml
sed -i "s/OPENVIDU_VERSION/${OPENVIDU_PRO_VERSION}/g" cfn-mkt-kms-ami.yaml
sed -i "s/OPENVIDU_RECORDING_DOCKER_TAG/${OPENVIDU_RECORDING_DOCKER_TAG}/g" cfn-mkt-kms-ami.yaml
sed -i "s/AMIEUWEST1/${AMIEUWEST1}/g" cfn-mkt-kms-ami.yaml
sed -i "s/AMIUSEAST1/${AMIUSEAST1}/g" cfn-mkt-kms-ami.yaml

## KMS AMI

# Copy template to S3
aws s3 cp cfn-mkt-kms-ami.yaml s3://aws.openvidu.io
TEMPLATE_URL=https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/cfn-mkt-kms-ami.yaml

# Update installation script
if [[ ${UPDATE_S3_FILES} == "true" ]]; then
  # Avoid overriding existing versions
  # Only master and non existing versions can be overriden
  if [[ ${OPENVIDU_PRO_VERSION} != "master-v2" ]]; then
    INSTALL_SCRIPT_EXISTS=true
    aws s3api head-object --bucket aws.openvidu.io --key install_media_node_$OPENVIDU_PRO_VERSION.sh || INSTALL_SCRIPT_EXISTS=false
    if [[ ${INSTALL_SCRIPT_EXISTS} == "true" ]]; then
      echo "Aborting updating s3://aws.openvidu.io/install_media_node_${OPENVIDU_PRO_VERSION}.sh. File actually exists."
      exit 1
    fi
  fi
  aws s3 cp ../docker-compose/media-node/install_media_node.sh s3://aws.openvidu.io/install_media_node_$OPENVIDU_PRO_VERSION.sh --acl public-read
fi

aws cloudformation create-stack \
  --stack-name kms-${DATESTAMP} \
  --template-url ${TEMPLATE_URL}
  # --disable-rollback

aws cloudformation wait stack-create-complete --stack-name kms-${DATESTAMP}

echo "Getting instance ID"
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=kms-${DATESTAMP}" | jq -r ' .Reservations[] | .Instances[] | .InstanceId')

echo "Stopping the instance"
aws ec2 stop-instances --instance-ids ${INSTANCE_ID}

echo "wait for the instance to stop"
aws ec2 wait instance-stopped --instance-ids ${INSTANCE_ID}

echo "Creating AMI"
KMS_RAW_AMI_ID=$(aws ec2 create-image --instance-id ${INSTANCE_ID} --name KMS-ov-${OPENVIDU_PRO_VERSION}-${DATESTAMP} --description "Kurento Media Server" --output text)

echo "Cleaning up"
aws cloudformation delete-stack --stack-name kms-${DATESTAMP}

# Wait for the instance
# Unfortunately, aws cli does not have a way to increase timeout
WAIT_RETRIES=0
WAIT_MAX_RETRIES=5
until [ "${WAIT_RETRIES}" -ge "${WAIT_MAX_RETRIES}" ]; do
  aws ec2 wait image-available --image-ids ${KMS_RAW_AMI_ID} && break
  WAIT_RETRIES=$((WAIT_RETRIES + 1))
  sleep 5
done

if [[ $CF_RELEASE == "true" ]]; then
  aws ec2 modify-image-attribute --image-id ${KMS_RAW_AMI_ID} --launch-permission "Add=[{Group=all}]"
  aws ec2 describe-images --image-ids ${KMS_RAW_AMI_ID} | jq -r '.Images[0].BlockDeviceMappings[0].Ebs.SnapshotId'
  SNAPSHOT_ID=$(aws ec2 describe-images --image-ids ${KMS_RAW_AMI_ID} | jq -r '.Images[0].BlockDeviceMappings[0].Ebs.SnapshotId')
  aws ec2 modify-snapshot-attribute --snapshot-id ${SNAPSHOT_ID} --create-volume-permission "Add=[{Group=all}]"
fi

## OpenVidu AMI

# Copy template to S3
aws s3 cp cfn-mkt-ov-ami.yaml s3://aws.openvidu.io
TEMPLATE_URL=https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/cfn-mkt-ov-ami.yaml

# Update installation script
if [[ ${UPDATE_S3_FILES} == "true" ]]; then
  # Avoid overriding existing versions
  # Only master and non existing versions can be overriden
  if [[ ${OPENVIDU_PRO_VERSION} != "master-v2" ]]; then
    INSTALL_SCRIPT_EXISTS=true
    aws s3api head-object --bucket aws.openvidu.io --key install_openvidu_pro_$OPENVIDU_PRO_VERSION.sh || INSTALL_SCRIPT_EXISTS=false
    if [[ ${INSTALL_SCRIPT_EXISTS} == "true" ]]; then
      echo "Aborting updating s3://aws.openvidu.io/install_openvidu_pro_${OPENVIDU_PRO_VERSION}.sh. File actually exists."
      exit 1
    fi
  fi
  aws s3 cp ../docker-compose/openvidu-server-pro/install_openvidu_pro.sh s3://aws.openvidu.io/install_openvidu_pro_$OPENVIDU_PRO_VERSION.sh --acl public-read
fi

aws cloudformation create-stack \
  --stack-name openvidu-${DATESTAMP} \
  --template-url ${TEMPLATE_URL}
  # --disable-rollback

aws cloudformation wait stack-create-complete --stack-name openvidu-${DATESTAMP}

echo "Getting instance ID"
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=openvidu-${DATESTAMP}" | jq -r ' .Reservations[] | .Instances[] | .InstanceId')

echo "Stopping the instance"
aws ec2 stop-instances --instance-ids ${INSTANCE_ID}

echo "wait for the instance to stop"
aws ec2 wait instance-stopped --instance-ids ${INSTANCE_ID}

echo "Creating AMI"
OV_RAW_AMI_ID=$(aws ec2 create-image --instance-id ${INSTANCE_ID} --name OpenViduServerPro-${OPENVIDU_PRO_VERSION}-${DATESTAMP} --description "Openvidu Server Pro" --output text)

echo "Cleaning up"
aws cloudformation delete-stack --stack-name openvidu-${DATESTAMP}

# Wait for the instance
# Unfortunately, aws cli does not have a way to increase timeout
WAIT_RETRIES=0
WAIT_MAX_RETRIES=5
until [ "${WAIT_RETRIES}" -ge "${WAIT_MAX_RETRIES}" ]; do
  aws ec2 wait image-available --image-ids ${OV_RAW_AMI_ID} && break
  WAIT_RETRIES=$((WAIT_RETRIES + 1))
  sleep 5
done

if [[ $CF_RELEASE == "true" ]]; then
  aws ec2 modify-image-attribute --image-id ${OV_RAW_AMI_ID} --launch-permission "Add=[{Group=all}]"
  aws ec2 describe-images --image-ids ${OV_RAW_AMI_ID} | jq -r '.Images[0].BlockDeviceMappings[0].Ebs.SnapshotId'
  SNAPSHOT_ID=$(aws ec2 describe-images --image-ids ${OV_RAW_AMI_ID} | jq -r '.Images[0].BlockDeviceMappings[0].Ebs.SnapshotId')
  aws ec2 modify-snapshot-attribute --snapshot-id ${SNAPSHOT_ID} --create-volume-permission "Add=[{Group=all}]"
fi

# Updating the template
sed "s/OV_AMI_ID/${OV_RAW_AMI_ID}/" CF-OpenVidu-Pro.yaml.template >CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml
sed -i "s/KMS_AMI_ID/${KMS_RAW_AMI_ID}/g" CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml
sed -i "s/_AWS_CLI_DOCKER_TAG_/${AWS_CLI_DOCKER_TAG}/g" CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml

# Update CF template
if [[ ${UPDATE_S3_FILES} == "true" ]]; then
  # Avoid overriding existing versions
  # Only master and non existing versions can be overriden
  if [[ ${OPENVIDU_PRO_VERSION} != "master-v2" ]]; then
    CF_EXIST=true
    aws s3api head-object --bucket aws.openvidu.io --key CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml || CF_EXIST=false
    if [[ ${CF_EXIST} == "true" ]]; then
      echo "Aborting updating s3://aws.openvidu.io/CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml. File actually exists."
      exit 1
    fi
  fi
  aws s3 cp CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml s3://aws.openvidu.io/CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml --acl public-read
fi

rm $TEMPJSON
rm cfn-mkt-kms-ami.yaml
rm cfn-mkt-ov-ami.yaml
aws s3api delete-object --bucket aws.openvidu.io --key cfn-mkt-kms-ami.yaml
aws s3api delete-object --bucket aws.openvidu.io --key cfn-mkt-ov-ami.yaml

# Return the KMS AMI identifier to the standard output
echo ${KMS_RAW_AMI_ID} >>${OUTPUT_FILE}
