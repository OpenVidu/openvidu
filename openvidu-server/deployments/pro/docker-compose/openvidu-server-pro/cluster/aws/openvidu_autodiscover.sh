#!/bin/bash 
set -eu -o pipefail

# Set debug mode
DEBUG=${DEBUG:-false}
[ "$DEBUG" == "true" ] && set -x

OUTPUT=$(mktemp -t openvidu-autodiscover-XXX --suffix .json)

docker run --rm amazon/aws-cli:"${AWS_CLI_DOCKER_TAG}" ec2 describe-instances \
  --output text \
  --filters "Name=instance-state-name,Values=running" \
            "Name=tag:ov-cluster-member,Values=kms" \
            "Name=tag:ov-stack-name,Values=${AWS_STACK_NAME}" \
            "Name=tag:ov-stack-region,Values=${AWS_DEFAULT_REGION}" \
  --query 'Reservations[*].Instances[*].{id:InstanceId,ip:PrivateIpAddress}' > "${OUTPUT}"

cat "${OUTPUT}" | jq --raw-input --slurp 'split("\n") | map(split("\t")) | .[0:-1] | map( { "id": .[0], "ip": .[1] } )'
