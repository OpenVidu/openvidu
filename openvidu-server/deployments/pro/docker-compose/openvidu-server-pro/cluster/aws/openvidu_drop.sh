#!/bin/bash 
set -e -o pipefail

# Set debug mode
DEBUG=${DEBUG:-false}
[ "$DEBUG" == "true" ] && set -x

ID=$1
[ -z "${ID}" ] && { echo "Must provide instance ID"; exit 1; }

docker run --rm amazon/aws-cli:2.0.7 ec2 terminate-instances --instance-ids ${ID} --output json 
