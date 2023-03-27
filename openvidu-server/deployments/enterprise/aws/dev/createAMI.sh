#!/bin/bash -x
set -eu -o pipefail

AWS_KEY_NAME=${AWS_KEY_NAME:-}
CF_RELEASE=${CF_RELEASE:-false}

# if [[ $CF_RELEASE == "true" ]]; then
#   git checkout v$OPENVIDU_PRO_VERSION
# fi

export AWS_DEFAULT_REGION=eu-west-1

DATESTAMP=$(date +%s)
TEMPJSON=$(mktemp -t cloudformation-XXX --suffix .json)

# Get Latest Ubuntu AMI id from specified region
getUbuntuAmiId() {
  local AMI_ID=$(
    aws --region ${1} ec2 describe-images \
      --filters "Name=name,Values=*ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*" \
      --query "sort_by(Images, &CreationDate)" |
      jq -r 'del(.[] | select(.ImageOwnerAlias != null)) | .[-1].ImageId'
  )
  echo $AMI_ID
}

AMIEUWEST1=$(getUbuntuAmiId 'eu-west-1')
AMIUSEAST1=$(getUbuntuAmiId 'us-east-1')

# Copy templates to feed
cp cfn-crete-ov-aws-asg-ami.yaml.template cfn-crete-ov-aws-asg-ami.yaml

## Setting Openvidu Version and Ubuntu Latest AMIs
if [[ ! -z ${AWS_KEY_NAME} ]]; then
  sed -i "s/      KeyName: AWS_KEY_NAME/      KeyName: ${AWS_KEY_NAME}/g" cfn-crete-ov-aws-asg-ami.yaml
else
  sed -i '/      KeyName: AWS_KEY_NAME/d' cfn-crete-ov-aws-asg-ami.yaml
fi
sed -i "s/AWS_KEY_NAME/${AWS_KEY_NAME}/g" cfn-crete-ov-aws-asg-ami.yaml
sed -i "s/USE_MASTER_DOCKER_IMAGES/${USE_MASTER_DOCKER_IMAGES}/g" cfn-crete-ov-aws-asg-ami.yaml
sed -i "s/AWS_DOCKER_TAG/${AWS_DOCKER_TAG}/g" cfn-crete-ov-aws-asg-ami.yaml
sed -i "s/OPENVIDU_RECORDING_DOCKER_TAG/${OPENVIDU_RECORDING_DOCKER_TAG}/g" cfn-crete-ov-aws-asg-ami.yaml
sed -i "s/OPENVIDU_VERSION/${OPENVIDU_PRO_VERSION}/g" cfn-crete-ov-aws-asg-ami.yaml
sed -i "s/AMIEUWEST1/${AMIEUWEST1}/g" cfn-crete-ov-aws-asg-ami.yaml
sed -i "s/AMIUSEAST1/${AMIUSEAST1}/g" cfn-crete-ov-aws-asg-ami.yaml

## OpenVidu AMI

# Copy template to S3
aws s3 cp cfn-crete-ov-aws-asg-ami.yaml s3://aws.openvidu.io
TEMPLATE_URL=https://s3-eu-west-1.amazonaws.com/aws.openvidu.io/cfn-crete-ov-aws-asg-ami.yaml

aws cloudformation create-stack \
  --stack-name openvidu-${DATESTAMP} \
  --template-url ${TEMPLATE_URL} \
  "$(if [ "$NIGHTLY" == "false" ]; then echo '--disable-rollback'; fi)"

aws cloudformation wait stack-create-complete --stack-name openvidu-${DATESTAMP}

echo "Getting instance ID"
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=openvidu-${DATESTAMP}" | jq -r ' .Reservations[] | .Instances[] | .InstanceId')

echo "Stopping the instance"
aws ec2 stop-instances --instance-ids ${INSTANCE_ID}

echo "wait for the instance to stop"
aws ec2 wait instance-stopped --instance-ids ${INSTANCE_ID}

echo "Creating AMI"
OV_RAW_AMI_ID=$(aws ec2 create-image --instance-id ${INSTANCE_ID} --name OpenViduServerProASG-${OPENVIDU_PRO_VERSION}-dev-${DATESTAMP} --description "Openvidu Server Pro AWS ASG" --output text)

echo "Cleaning up"
aws cloudformation delete-stack --stack-name openvidu-${DATESTAMP}

echo "Create AMI with ID: ${OV_RAW_AMI_ID}"

# Wait for the instance
# Unfortunately, aws cli does not have a way to increase timeout
WAIT_RETRIES=0
WAIT_MAX_RETRIES=3
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
if [[ "${USE_MASTER_DOCKER_IMAGES}" == "true" ]]; then
  KMS_AMI_ID="$(aws ec2 describe-images --filters Name=image-type,Values=machine Name=is-public,Values=false \
    --query 'Images[?starts_with(Name, `KMS-ov-master`) == `true`][CreationDate, Name, ImageId, Public]' \
    --output text | sort -r -k1 | head -n1 | awk '{ print $3 }')"
fi
cd ..
sed "s/OV_MASTER_REPLICATION_AMI_ID/${OV_RAW_AMI_ID}/" CF-OpenVidu-Enterprise.yaml.template >CF-OpenVidu-Enterprise-dev-${OPENVIDU_PRO_VERSION}.yaml
sed -i "s/KMS_AMI_ID/${KMS_AMI_ID}/g" CF-OpenVidu-Enterprise-dev-${OPENVIDU_PRO_VERSION}.yaml
sed -i "s/AWS_DOCKER_TAG/${AWS_DOCKER_TAG}/g" CF-OpenVidu-Enterprise-dev-${OPENVIDU_PRO_VERSION}.yaml
# Update CF template
aws s3 cp CF-OpenVidu-Enterprise-dev-${OPENVIDU_PRO_VERSION}.yaml s3://aws.openvidu.io/CF-OpenVidu-Enterprise-dev-${OPENVIDU_PRO_VERSION}.yaml --acl public-read

cd dev

rm $TEMPJSON
mv cfn-crete-ov-aws-asg-ami.yaml CF-OpenVidu-Enterprise-AMI.yaml
aws s3api delete-object --bucket aws.openvidu.io --key cfn-crete-ov-aws-asg-ami.yaml
