# Deploy Multi-Master cloudformation

1. Replace all of the variables of file cf_parameters.conf with the proper values. For example:

```conf
export DOMAIN_NAME="ov-multimaster-2.k8s.codeurjc.es"
export OPENVIDU_LICENSE="valid-license"
export KIBANA_HOST="https://search-ov-elasticsearch-3gxumtiwg67qp6jplw7rkjshrm.eu-west-1.es.amazonaws.com:443/_plugin/kibana/"
export ELASTICSEARCH_HOST="https://search-ov-elasticsearch-3gxumtiwg67qp6jplw7rkjshrm.eu-west-1.es.amazonaws.com:443"
export SSH_KEY_NAME="kms-aws-share-key"
export VPC="vpc-6bf6a10f"
export SUBNETS="subnet-599ebd3d,subnet-f1ed81a9"
export LOAD_BALANCER_CERTIFICATE="arn:aws:acm:eu-west-1:849201093595:certificate/01d51580-d8fc-45b0-9c72-e7666ba890d9"
export MASTER_NODE_INSTANCE_TYPE="t2.large"
export MEDIA_NODE_INSTANCE_TYPE="t2.large"
```

2. Run script `./deploy_cf.sh`

3. Update Route 53 to link the domain name to the Load Balancer. At [https://console.aws.amazon.com/route53/v2/hostedzones#ListRecordSets/](https://console.aws.amazon.com/route53/v2/hostedzones#ListRecordSets/) edit record of subdomain `ov-multimaster-2.k8s.codeurjc.es`, routing traffic to the Load Balancer (dualstack.ov-pro-multimaster-VAR1-lb-VAR2.eu-west-1.elb.amazonaws.com).