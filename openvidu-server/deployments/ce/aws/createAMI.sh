#!/bin/bash -x
set -eu -o pipefail

CF_RELEASE=${CF_RELEASE:-false}
AWS_KEY_NAME=${AWS_KEY_NAME:-}

if [[ $CF_RELEASE == "true" ]]; then
    git checkout v$OPENVIDU_VERSION
fi

export AWS_DEFAULT_REGION=eu-west-1


DATESTAMP=$(date +%s)
TEMPJSON=$(mktemp -t cloudformation-XXX --suffix .json)

# Get Latest Ubuntu AMI id from specified region
# Parameters
# $1 Aws region
getUbuntuAmiId() {
    local AMI_ID=$(
        aws --region ${1} ec2 describe-images \
        --filters Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64* \
        --query 'Images[*].[ImageId,CreationDate]' \
        --output text  \
        | sort -k2 -r  | head -n1 | cut -d$'\t' -f1
    )
    echo $AMI_ID
}

AMIEUWEST1=$(getUbuntuAmiId 'eu-west-1')
AMIUSEAST1=$(getUbuntuAmiId 'us-east-1')

# Copy templates to feed
cp cfn-mkt-ov-ce-ami.yaml.template cfn-mkt-ov-ce-ami.yaml

## Setting Openvidu Version and Ubuntu Latest AMIs
if [[ ! -z ${AWS_KEY_NAME} ]]; then
  sed -i "s/      KeyName: AWS_KEY_NAME/      KeyName: ${AWS_KEY_NAME}/g" cfn-mkt-ov-ce-ami.yaml
else
  sed -i '/      KeyName: AWS_KEY_NAME/d' cfn-mkt-ov-ce-ami.yaml
fi
sed -i "s/AWS_KEY_NAME/${AWS_KEY_NAME}/g" cfn-mkt-ov-ce-ami.yaml
sed -i "s/OPENVIDU_VERSION/${OPENVIDU_VERSION}/g" cfn-mkt-ov-ce-ami.yaml
sed -i "s/OPENVIDU_RECORDING_DOCKER_TAG/${OPENVIDU_RECORDING_DOCKER_TAG}/g" cfn-mkt-ov-ce-ami.yaml
sed -i "s/AMIEUWEST1/${AMIEUWEST1}/g" cfn-mkt-ov-ce-ami.yaml
sed -i "s/AMIUSEAST1/${AMIUSEAST1}/g" cfn-mkt-ov-ce-ami.yaml

## OpenVidu AMI

# Copy template to S3
aws s3 cp cfn-mkt-ov-ce-ami.yaml s3://aws.openvidu.io
TEMPLATE_URL=https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/cfn-mkt-ov-ce-ami.yaml

# Update installation script
if [[ ${UPDATE_INSTALLATION_SCRIPT} == "true" ]]; then
  aws s3 cp  ../docker-compose/install_openvidu.sh s3://aws.openvidu.io/install_openvidu_$OPENVIDU_VERSION.sh --acl public-read
fi

aws cloudformation create-stack \
  --stack-name openvidu-ce-${DATESTAMP} \
  --template-url ${TEMPLATE_URL} \
  --disable-rollback

aws cloudformation wait stack-create-complete --stack-name openvidu-ce-${DATESTAMP}

echo "Getting instance ID"
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=openvidu-ce-${DATESTAMP}" | jq -r ' .Reservations[] | .Instances[] | .InstanceId')

echo "Stopping the instance"
aws ec2 stop-instances --instance-ids ${INSTANCE_ID}

echo "wait for the instance to stop"
aws ec2 wait instance-stopped --instance-ids ${INSTANCE_ID}

echo "Creating AMI"
OV_RAW_AMI_ID=$(aws ec2 create-image --instance-id ${INSTANCE_ID} --name OpenViduServerCE-${OPENVIDU_VERSION}-${DATESTAMP} --description "Openvidu Server CE" --output text)

echo "Cleaning up"
aws cloudformation delete-stack --stack-name openvidu-ce-${DATESTAMP}

# Wait for the instance
# Unfortunately, aws cli does not have a way to increase timeout
WAIT_RETRIES=0
WAIT_MAX_RETRIES=3
until [ "${WAIT_RETRIES}" -ge "${WAIT_MAX_RETRIES}" ]
do
   aws ec2 wait image-available --image-ids ${OV_RAW_AMI_ID} && break
   WAIT_RETRIES=$((WAIT_RETRIES+1)) 
   sleep 5
done

# Updating the template
sed "s/OV_AMI_ID/${OV_RAW_AMI_ID}/" CF-OpenVidu.yaml.template > CF-OpenVidu-${OPENVIDU_VERSION}.yaml
sed -i "s/OPENVIDU_VERSION/${OPENVIDU_VERSION}/g" CF-OpenVidu-${OPENVIDU_VERSION}.yaml

rm $TEMPJSON
rm cfn-mkt-ov-ce-ami.yaml
