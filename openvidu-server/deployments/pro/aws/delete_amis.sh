#!/bin/bash -x
set -eu -o pipefail

# Process AMI_LIST
AMI_LIST=($(echo "$AMI_LIST" | tr ',' '\n'))

# Remove the list of AMIs in each region
for line in "${AMI_LIST[@]}"
do
	REGION=$(echo "${line}" | cut -d":" -f1)
	AMI_ID=$(echo "${line}" | cut -d":" -f2)
      export AWS_DEFAULT_REGION=${REGION}

      mapfile -t SNAPSHOTS < <(aws ec2 describe-images --image-ids "$AMI_ID" --include-deprecated --output text --query 'Images[*].BlockDeviceMappings[*].Ebs.SnapshotId')
      echo "Deregistering $AMI_ID"
	aws ec2 deregister-image --image-id "${AMI_ID}"
      sleep 1
      for snapshot in "${SNAPSHOTS[@]}";
      do
            echo "Deleting Snapshot $snapshot from $AMI_ID"
            aws ec2 delete-snapshot --snapshot-id "${snapshot}"
            sleep 1
      done
done