#!/bin/bash
set -e -o pipefail

# Set debug mode
DEBUG=${DEBUG:-false}
[ "$DEBUG" == "true" ] && set -x

TMPFILE=$(mktemp -t openvidu-userdata-XXX --suffix .txt)
OUTPUT=$(mktemp -t openvidu-launch-kms-XXX --suffix .json)
ERROUTPUT=$(mktemp -t openvidu-launch-kms-XXX --suffix .err)

trap exit_on_error ERR

exit_on_error () {
  ERROR_TYPE=$(cat ${ERROUTPUT} | awk '{ print $4 }' | sed -r 's/\(|\)//g' | tr -d '\n')

  case ${ERROR_TYPE}
  in
    "InvalidParameterValue")
      echo -e "Parameter invalid " $(cat ${ERROUTPUT}) >&2
      exit 1
      ;;

    "UnauthorizedOperation")
      MSG_COD=$(cat ${ERROUTPUT} | awk -F: '{ print $3 }')
      MSG_DEC=$(docker run --rm amazon/aws-cli:"${AWS_CLI_DOCKER_TAG}" sts decode-authorization-message --encoded-message "${MSG_COD}")

      echo -e "Unauthorized " $(cat ${MSG_DEC}) >&2
      exit 1
      ;;
    *)
      echo -e "Unknown error " $(cat ${ERROUTPUT}) >&2
      exit 1
      ;;
  esac
}

# Check custom parameters
if [[ -n "${CUSTOM_INSTANCE_TYPE}" ]]; then
  AWS_INSTANCE_TYPE="${CUSTOM_INSTANCE_TYPE}"
fi
if [[ -n "${CUSTOM_VOLUME_SIZE}" ]]; then
  AWS_VOLUME_SIZE="${CUSTOM_VOLUME_SIZE}"
fi

docker run --rm amazon/aws-cli:"${AWS_CLI_DOCKER_TAG}" ec2 run-instances \
    --image-id "${AWS_IMAGE_ID}" --count 1 \
    --instance-type "${AWS_INSTANCE_TYPE}" \
    --key-name "${AWS_KEY_NAME}" \
    --subnet-id "${AWS_SUBNET_ID}" \
    --tag-specifications "ResourceType=instance,Tags=[{Key='Name',Value='OpenVidu Pro Media Node'},{Key='ov-cluster-member',Value='kms'},{Key='ov-stack-name',Value='${AWS_STACK_NAME}'},{Key='ov-stack-region',Value='${AWS_DEFAULT_REGION}'}]" \
    --iam-instance-profile Name="OpenViduInstanceProfile-${AWS_STACK_NAME}-${AWS_DEFAULT_REGION}" \
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={DeleteOnTermination=True,VolumeType='gp2',VolumeSize='${AWS_VOLUME_SIZE}'}" \
    --security-group-ids "${AWS_SECURITY_GROUP}" > "${OUTPUT}" 2> "${ERROUTPUT}"

docker run --rm amazon/aws-cli:"${AWS_CLI_DOCKER_TAG}" ec2 wait instance-running --instance-ids $(cat ${OUTPUT} | jq --raw-output ' .Instances[] | .InstanceId')

# Generating the output
KMS_IP=$(cat "${OUTPUT}" | jq --raw-output ' .Instances[] | .NetworkInterfaces[0] | .PrivateIpAddress')
KMS_ID=$(cat "${OUTPUT}" | jq --raw-output ' .Instances[] | .InstanceId')

jq -n \
  --arg id "${KMS_ID}" \
  --arg ip "${KMS_IP}" \
  '{ id: $id, ip: $ip }'
