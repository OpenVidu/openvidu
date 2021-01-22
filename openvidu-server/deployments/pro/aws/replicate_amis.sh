#!/bin/bash
set -eu -o pipefail

# Replicate AMIs in all regions
#
# Input parameters:
#
# KMS_AMI_NAME  Media server AMI Name
# KMS_AMI_ID    Media server AMI ID
#
# OV_AMI_NAME   OpenVidu AMI Name
# OV_AMI_ID     OpenVidu AMI ID
#
# UPDATE_CF         Boolean, true if you want to update CF template by OPENVIDU_PRO_VERSION
# OPENVIDU_VERSION  OpenVidu Version of the CF you want to update. It will update CF-OpenVidu-Pro-OPENVIDU_PRO_VERSION 

export AWS_DEFAULT_REGION=eu-west-1

echo "Making original AMIs public"

aws ec2 wait image-exists --image-ids ${OV_AMI_ID}
aws ec2 wait image-available --image-ids ${OV_AMI_ID}
aws ec2 modify-image-attribute --image-id ${OV_AMI_ID} --launch-permission "Add=[{Group=all}]"

aws ec2 wait image-exists --image-ids ${KMS_AMI_ID}
aws ec2 wait image-available --image-ids ${KMS_AMI_ID}
aws ec2 modify-image-attribute --image-id ${KMS_AMI_ID} --launch-permission "Add=[{Group=all}]"

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

OPENVIDU_SERVER_PRO_AMI_IDS=()
MEDIA_NODE_AMI_IDS=()
REGIONS=()
for REGION in ${TARGET_REGIONS}
do
    REGIONS+=($REGION)
    ID=$(aws ec2 copy-image --name ${OV_AMI_NAME} --source-image-id ${OV_AMI_ID} --source-region ${AWS_DEFAULT_REGION} --region ${REGION} --output text --query 'ImageId')
    echo "Replicated OpenVidu Server Pro AMI in region ${REGION} with id ${ID}"
    OPENVIDU_SERVER_PRO_AMI_IDS+=($ID)
    ID=$(aws ec2 copy-image --name ${KMS_AMI_NAME} --source-image-id ${KMS_AMI_ID} --source-region ${AWS_DEFAULT_REGION} --region ${REGION} --output text --query 'ImageId')
    echo "Replicated Media Node AMI in region ${REGION} with id ${ID}"
    MEDIA_NODE_AMI_IDS+=($ID)
done

if [ "${#OPENVIDU_SERVER_PRO_AMI_IDS[@]}" -ne "${#REGIONS[@]}" ]; then
    echo "The number of elements in array of OpenVidu Server Pro AMI ids and array of regions is not equal"
    exit 1
fi
if [ "${#MEDIA_NODE_AMI_IDS[@]}" -ne "${#REGIONS[@]}" ]; then
    echo "The number of elements in array of Media Node AMI ids and array of regions is not equal"
    exit 1
fi

echo "Waiting for images to be available..."
echo "-------------------------------------"
ITER=0
for i in "${REGIONS[@]}"
do
    REGION=${REGIONS[$ITER]}
    # OpenVidu Server Pro Node
    OV_AMI_ID=${OPENVIDU_SERVER_PRO_AMI_IDS[$ITER]}
	aws ec2 wait image-exists --region ${REGION} --image-ids ${OV_AMI_ID}
    echo "${OV_AMI_ID} of region ${REGION} exists"
    aws ec2 wait image-available --region ${REGION} --image-ids ${OV_AMI_ID}
    echo "${OV_AMI_ID} of region ${REGION} available"
    aws ec2 modify-image-attribute --region ${REGION} --image-id ${OV_AMI_ID} --launch-permission "Add=[{Group=all}]"
    echo "${OV_AMI_ID} of region ${REGION} is now public"
    # Media Node
    KMS_AMI_ID=${MEDIA_NODE_AMI_IDS[$ITER]}
    aws ec2 wait image-exists --region ${REGION} --image-ids ${KMS_AMI_ID}
    echo "${KMS_AMI_ID} of region ${REGION} exists"
    aws ec2 wait image-available --region ${REGION} --image-ids ${KMS_AMI_ID}
    echo "${KMS_AMI_ID} of region ${REGION} available"
    aws ec2 modify-image-attribute --region ${REGION} --image-id ${KMS_AMI_ID} --launch-permission "Add=[{Group=all}]"
    echo "${KMS_AMI_ID} of region ${REGION} is now public"
    echo "-------------------------------------"
    ITER=$(expr $ITER + 1)
done


# Print and generate replicated AMIS
REPLICATED_AMIS_FILE="replicated_amis.yaml"
echo "OV AMIs and KMS AMIs replication:"
{
    echo "#start_mappings"
    echo "Mappings:"
    echo "  OVAMIMAP:"
    ITER=0
    for i in "${OPENVIDU_SERVER_PRO_AMI_IDS[@]}"
    do
        AMI_ID=${OPENVIDU_SERVER_PRO_AMI_IDS[$ITER]}
        REGION=${REGIONS[$ITER]}
        echo "    ${REGION}:"
        echo "      AMI: ${AMI_ID}"
        ITER=$(expr $ITER + 1)
    done
    echo ""
    echo "  KMSAMIMAP:"
    ITER=0
    for i in "${MEDIA_NODE_AMI_IDS[@]}"
    do
        AMI_ID=${MEDIA_NODE_AMI_IDS[$ITER]}
        REGION=${REGIONS[$ITER]}
        echo "    ${REGION}:"
        echo "      AMI: ${AMI_ID}"
        ITER=$(expr $ITER + 1)
    done
    echo "#end_mappings"
    echo ""
} > "${REPLICATED_AMIS_FILE}" 2>&1

# Print replicated AMIs
cat "${REPLICATED_AMIS_FILE}"

if [[ ${UPDATE_CF} == "true" ]]; then
    if [[ ! -z ${OPENVIDU_PRO_VERSION} ]]; then
        # Download s3 file
        aws s3 cp s3://aws.openvidu.io/CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml
        sed -e "/^#end_mappings/r ${REPLICATED_AMIS_FILE}" -e '/^#start_mappings/,/^#end_mappings/d' -i CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml
        aws s3 cp CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml s3://aws.openvidu.io/CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml --acl public-read
    fi
fi

# Print AMI_LIST for delete_amis.sh
AMI_LIST=""
ITER=0
for i in "${OPENVIDU_SERVER_PRO_AMI_IDS[@]}"
do
    AMI_ID=${OPENVIDU_SERVER_PRO_AMI_IDS[$ITER]}
    REGION=${REGIONS[$ITER]}
    if [[ ${ITER} -eq  0 ]]; then
        AMI_LIST="${REGION}:${AMI_ID}"
    else 
        AMI_LIST="${AMI_LIST},${REGION}:${AMI_ID}"
    fi
    ITER=$(expr $ITER + 1)
done
echo "AMI_LIST_OV: ${AMI_LIST}"

# Print AMI_LIST for delete_amis.sh
AMI_LIST=""
ITER=0
for i in "${MEDIA_NODE_AMI_IDS[@]}"
do
    AMI_ID=${MEDIA_NODE_AMI_IDS[$ITER]}
    REGION=${REGIONS[$ITER]}
    if [[ ${ITER} -eq  0 ]]; then
        AMI_LIST="${REGION}:${AMI_ID}"
    else 
        AMI_LIST="${AMI_LIST},${REGION}:${AMI_ID}"
    fi
    ITER=$(expr $ITER + 1)
done
echo "AMI_LIST_KMS: ${AMI_LIST}"

# Cleaning the house
rm "${REPLICATED_AMIS_FILE}"
rm CF-OpenVidu-Pro-${OPENVIDU_PRO_VERSION}.yaml