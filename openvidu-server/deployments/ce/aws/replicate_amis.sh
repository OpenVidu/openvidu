#!/bin/bash
set -eu -o pipefail

# Replicate AMIs in all regions
#
# Input parameters:
#
# OV_AMI_NAME   OpenVidu AMI Name
# OV_AMI_ID     OpenVidu AMI ID

export AWS_DEFAULT_REGION=eu-west-1
if [ ${CF_OVP_TARGET} == "market" ]; then
    export AWS_ACCESS_KEY_ID=${NAEVA_AWS_ACCESS_KEY_ID}
    export AWS_SECRET_ACCESS_KEY=${NAEVA_AWS_SECRET_ACCESS_KEY}
fi

echo "Making original AMI public"
aws ec2 wait image-exists --image-ids ${OV_AMI_ID}
aws ec2 wait image-available --image-ids ${OV_AMI_ID}
aws ec2 modify-image-attribute --image-id ${OV_AMI_ID} --launch-permission "Add=[{Group=all}]"

TARGET_REGIONS="eu-north-1
                eu-west-3
                eu-west-2
                eu-west-1
                sa-east-1
                ca-central-1
                ap-south-1
                ap-southeast-1
                ap-southeast-2
                ap-northeast-1
                ap-northeast-2
                ap-east-1
                eu-central-1
                us-east-1
                us-east-2
                us-west-1
                us-west-2
                me-south-1
                af-south-1"

AMI_IDS=()
REGIONS=()
for REGION in ${TARGET_REGIONS}
do
    ID=$(aws ec2 copy-image --name ${OV_AMI_NAME} --source-image-id ${OV_AMI_ID} --source-region ${AWS_DEFAULT_REGION} --region ${REGION} --output text --query 'ImageId')
    echo "Replicated AMI in region ${REGION} with id ${ID}"
    AMI_IDS+=($ID)
    REGIONS+=($REGION)
done

if [ "${#AMI_IDS[@]}" -ne "${#REGIONS[@]}" ]; then
    echo "The number of elements in array of AMI ids and array of regions is not equal"
    exit 1
fi

echo "Waiting for images to be available..."
echo "-------------------------------------"
ITER=0
for i in "${AMI_IDS[@]}"
do
    AMI_ID=${AMI_IDS[$ITER]}
    REGION=${REGIONS[$ITER]}
	aws ec2 wait image-exists --region ${REGION} --image-ids ${AMI_ID}
    echo "${AMI_ID} of region ${REGION} exists"
    aws ec2 wait image-available --region ${REGION} --image-ids ${AMI_ID}
    echo "${AMI_ID} of region ${REGION} available"
    aws ec2 modify-image-attribute --region ${REGION} --image-id ${AMI_ID} --launch-permission "Add=[{Group=all}]"
    echo "${AMI_ID} of region ${REGION} is now public"
    echo "-------------------------------------"
    ITER=$(expr $ITER + 1)
done

echo "OV IDs"
ITER=0
for i in "${AMI_IDS[@]}"
do
    AMI_ID=${AMI_IDS[$ITER]}
    REGION=${REGIONS[$ITER]}
    echo "    ${REGION}:"
    echo "      AMI: ${AMI_ID}"
    ITER=$(expr $ITER + 1)
done