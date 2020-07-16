#!/bin/bash -x
set -eu -o pipefail

CF_OVP_TARGET=${CF_OVP_TARGET:-nomarket}

if [ ${CF_OVP_TARGET} == "market" ]; then
  export AWS_ACCESS_KEY_ID=${NAEVA_AWS_ACCESS_KEY_ID}
  export AWS_SECRET_ACCESS_KEY=${NAEVA_AWS_SECRET_ACCESS_KEY}
  export AWS_DEFAULT_REGION=us-east-1
else
  export AWS_DEFAULT_REGION=eu-west-1
fi

DATESTAMP=$(date +%s)
TEMPJSON=$(mktemp -t cloudformation-XXX --suffix .json)

# Get Latest Ubuntu AMI id from specified region
# Parameters
# $1 Aws region
getUbuntuAmiId() {
    local AMI_ID=$(
        aws --region ${1} ec2 describe-images \
        --filters Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-xenial-16.04-amd64* \
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
sed -i "s/OPENVIDU_VERSION/${OPENVIDU_VERSION}/g" cfn-mkt-ov-ce-ami.yaml
sed -i "s/OPENVIDU_RECORDING_DOCKER_TAG/${OPENVIDU_RECORDING_DOCKER_TAG}/g" cfn-mkt-ov-ce-ami.yaml
sed -i "s/AMIEUWEST1/${AMIEUWEST1}/g" cfn-mkt-ov-ce-ami.yaml
sed -i "s/AMIUSEAST1/${AMIUSEAST1}/g" cfn-mkt-ov-ce-ami.yaml

## OpenVidu AMI

# Copy template to S3
aws s3 cp cfn-mkt-ov-ce-ami.yaml s3://aws.openvidu.io
TEMPLATE_URL=https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/cfn-mkt-ov-ce-ami.yaml

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
aws ec2 wait image-available --image-ids ${OV_RAW_AMI_ID}

# Updating the template
sed "s/OV_AMI_ID/${OV_RAW_AMI_ID}/" CF-OpenVidu.yaml.template > CF-OpenVidu-${OPENVIDU_VERSION}.yaml
sed -i "s/OPENVIDU_VERSION/${OPENVIDU_VERSION}/g" CF-OpenVidu-${OPENVIDU_VERSION}.yaml

rm $TEMPJSON
rm cfn-mkt-ov-ce-ami.yaml
