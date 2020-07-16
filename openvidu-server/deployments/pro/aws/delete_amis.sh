#!/bin/bash -x
set -eu -o pipefail

# Remove the list of AMIs in each region

export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=

LIST="us-east-2:ami-0b779580e2c11e904
      us-west-1:ami-085b7176f53c6d7fe
      us-west-2:ami-029d0ac01cf0f56be
      ap-south-1:ami-044a9335de8413f90
      ap-northeast-2:ami-031f6637449d2821d
      ap-southeast-1:ami-0aba433c88526cc8a
      ap-southeast-2:ami-0ee526f6103ac2bd9
      ap-northeast-1:ami-03b3cc03809d43b36
      ca-central-1:ami-071388f538500db04
      eu-central-1:ami-080a9cbd1d3e64583
      eu-west-1:ami-05e6bc185f28b6338
      eu-west-2:ami-0f06e2c003eef90f1
      eu-west-3:ami-0fd9b5eaf08fc0936
      eu-north-1:ami-0e7717a400ba2f1c1
      sa-east-1:ami-0cd51a71e9791197a
      us-east-2:ami-0064508c09a32a93f
      us-west-1:ami-088d1a7099fa57038
      us-west-2:ami-080d4d462cff92974
      ap-south-1:ami-00a60b079166e7dd4
      ap-northeast-2:ami-0f4edc3faf639e044
      ap-southeast-1:ami-0235dbfa3662608a0
      ap-southeast-2:ami-0f5f46178512e6e07
      ap-northeast-1:ami-047b086aa0745ce19
      ca-central-1:ami-0777b151c44ef9944
      eu-central-1:ami-00dd31f7b896f233f
      eu-west-1:ami-0fb9f924ede905546
      eu-west-2:ami-0defcea3b8c198e1e
      eu-west-3:ami-0c56da0b482bdf48e
      eu-north-1:ami-054fc49723d3d516a
      sa-east-1:ami-0dca8c31325d33c72"

for line in ${LIST}
do
	REGION=$(echo ${line} | cut -d":" -f1)
	AMI_ID=$(echo ${line} | cut -d":" -f2)
	export AWS_DEFAULT_REGION=${REGION}
	aws ec2 deregister-image --image-id $AMI_ID
	sleep 1
done