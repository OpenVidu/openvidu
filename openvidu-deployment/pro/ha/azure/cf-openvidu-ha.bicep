@description('Stack name')
param stackName string

@description('''
[selfsigned] Not recommended for production use. Just for testing purposes or development environments. You don't need a FQDN to use this option.
[owncert] Valid for production environments. Use your own certificate. You need a FQDN to use this option.
[letsencrypt] Valid for production environments. Can be used with or without a FQDN (if no FQDN is provided, a random sslip.io domain will be used).
''')
@allowed([
  'selfsigned'
  'owncert'
  'letsencrypt'
])
param certificateType string = 'letsencrypt'

@description('Domain name for the OpenVidu Deployment.')
param domainName string = ''

@description('If certificate type is \'owncert\', this parameter will be used to specify the public certificate')
param ownPublicCertificate string = ''

@description('If certificate type is \'owncert\', this parameter will be used to specify the private certificate')
param ownPrivateCertificate string = ''



@description('Name of the PublicIPAddress resource in Azure when using certificateType \'owncert\' or \'letsencrypt\'')
param publicIpAddressObject object

@description('(Optional) Domain name for the TURN server with TLS. Only needed if your users are behind restrictive firewalls')
param turnDomainName string = ''

@description('(Optional) This setting is applicable if the certificate type is set to \'owncert\' and the TurnDomainName is specified.')
param turnOwnPublicCertificate string = ''

@description('(Optional) This setting is applicable if the certificate type is set to \'owncert\' and the TurnDomainName is specified.')
param turnOwnPrivateCertificate string = ''

@description('Visit https://openvidu.io/account')
@secure()
param openviduLicense string

@description('RTCEngine media engine to use')
@allowed([
  'pion'
  'mediasoup'
])
param rtcEngine string = 'pion'

@description('Specifies the EC2 instance type for your OpenVidu Master Node')
@allowed([
  'Standard_B1s'
  'Standard_B1ms'
  'Standard_B2s'
  'Standard_B2ms'
  'Standard_B4ms'
  'Standard_B8ms'
  'Standard_D2_v3'
  'Standard_D4_v3'
  'Standard_D8_v3'
  'Standard_D16_v3'
  'Standard_D32_v3'
  'Standard_D48_v3'
  'Standard_D64_v3'
  'Standard_D2_v4'
  'Standard_D4_v4'
  'Standard_D8_v4'
  'Standard_D16_v4'
  'Standard_D32_v4'
  'Standard_D48_v4'
  'Standard_D64_v4'
  'Standard_D96_v4'
  'Standard_D2_v5'
  'Standard_D4_v5'
  'Standard_D8_v5'
  'Standard_D16_v5'
  'Standard_D32_v5'
  'Standard_D48_v5'
  'Standard_D64_v5'
  'Standard_D96_v5'
  'Standard_F2'
  'Standard_F4'
  'Standard_F8'
  'Standard_F16'
  'Standard_F32'
  'Standard_F64'
  'Standard_F72'
  'Standard_F2s_v2'
  'Standard_F4s_v2'
  'Standard_F8s_v2'
  'Standard_F16s_v2'
  'Standard_F32s_v2'
  'Standard_F64s_v2'
  'Standard_F72s_v2'
  'Standard_E2_v3'
  'Standard_E4_v3'
  'Standard_E8_v3'
  'Standard_E16_v3'
  'Standard_E32_v3'
  'Standard_E48_v3'
  'Standard_E64_v3'
  'Standard_E96_v3'
  'Standard_E2_v4'
  'Standard_E4_v4'
  'Standard_E8_v4'
  'Standard_E16_v4'
  'Standard_E32_v4'
  'Standard_E48_v4'
  'Standard_E64_v4'
  'Standard_E2_v5'
  'Standard_E4_v5'
  'Standard_E8_v5'
  'Standard_E16_v5'
  'Standard_E32_v5'
  'Standard_E48_v5'
  'Standard_E64_v5'
  'Standard_E96_v5'
  'Standard_M64'
  'Standard_M128'
  'Standard_M208ms_v2'
  'Standard_M416ms_v2'
  'Standard_L4s_v2'
  'Standard_L8s_v2'
  'Standard_L16s_v2'
  'Standard_L32s_v2'
  'Standard_L64s_v2'
  'Standard_L80s_v2'
  'Standard_NC6'
  'Standard_NC12'
  'Standard_NC24'
  'Standard_NC24r'
  'Standard_ND6s'
  'Standard_ND12s'
  'Standard_ND24s'
  'Standard_ND24rs'
  'Standard_NV6'
  'Standard_NV12'
  'Standard_NV24'
  'Standard_H8'
  'Standard_H16'
  'Standard_H16r'
  'Standard_H16mr'
  'Standard_HB120rs_v2'
  'Standard_HC44rs'
  'Standard_DC2s'
  'Standard_DC4s'
  'Standard_DC2s_v2'
  'Standard_DC4s_v2'
  'Standard_DC8s_v2'
  'Standard_DC16s_v2'
  'Standard_DC32s_v2'
  'Standard_A1_v2'
  'Standard_A2_v2'
  'Standard_A4_v2'
  'Standard_A8_v2'
  'Standard_A2m_v2'
  'Standard_A4m_v2'
  'Standard_A8m_v2'
])
param masterNodeInstanceType string = 'Standard_B2s'

@description('Size of the disk in GB')
param masterNodesDiskSize int = 100

@description('Specifies the EC2 instance type for your OpenVidu Media Nodes')
@allowed([
  'Standard_B1s'
  'Standard_B1ms'
  'Standard_B2s'
  'Standard_B2ms'
  'Standard_B4ms'
  'Standard_B8ms'
  'Standard_D2_v3'
  'Standard_D4_v3'
  'Standard_D8_v3'
  'Standard_D16_v3'
  'Standard_D32_v3'
  'Standard_D48_v3'
  'Standard_D64_v3'
  'Standard_D2_v4'
  'Standard_D4_v4'
  'Standard_D8_v4'
  'Standard_D16_v4'
  'Standard_D32_v4'
  'Standard_D48_v4'
  'Standard_D64_v4'
  'Standard_D96_v4'
  'Standard_D2_v5'
  'Standard_D4_v5'
  'Standard_D8_v5'
  'Standard_D16_v5'
  'Standard_D32_v5'
  'Standard_D48_v5'
  'Standard_D64_v5'
  'Standard_D96_v5'
  'Standard_F2'
  'Standard_F4'
  'Standard_F8'
  'Standard_F16'
  'Standard_F32'
  'Standard_F64'
  'Standard_F72'
  'Standard_F2s_v2'
  'Standard_F4s_v2'
  'Standard_F8s_v2'
  'Standard_F16s_v2'
  'Standard_F32s_v2'
  'Standard_F64s_v2'
  'Standard_F72s_v2'
  'Standard_E2_v3'
  'Standard_E4_v3'
  'Standard_E8_v3'
  'Standard_E16_v3'
  'Standard_E32_v3'
  'Standard_E48_v3'
  'Standard_E64_v3'
  'Standard_E96_v3'
  'Standard_E2_v4'
  'Standard_E4_v4'
  'Standard_E8_v4'
  'Standard_E16_v4'
  'Standard_E32_v4'
  'Standard_E48_v4'
  'Standard_E64_v4'
  'Standard_E2_v5'
  'Standard_E4_v5'
  'Standard_E8_v5'
  'Standard_E16_v5'
  'Standard_E32_v5'
  'Standard_E48_v5'
  'Standard_E64_v5'
  'Standard_E96_v5'
  'Standard_M64'
  'Standard_M128'
  'Standard_M208ms_v2'
  'Standard_M416ms_v2'
  'Standard_L4s_v2'
  'Standard_L8s_v2'
  'Standard_L16s_v2'
  'Standard_L32s_v2'
  'Standard_L64s_v2'
  'Standard_L80s_v2'
  'Standard_NC6'
  'Standard_NC12'
  'Standard_NC24'
  'Standard_NC24r'
  'Standard_ND6s'
  'Standard_ND12s'
  'Standard_ND24s'
  'Standard_ND24rs'
  'Standard_NV6'
  'Standard_NV12'
  'Standard_NV24'
  'Standard_H8'
  'Standard_H16'
  'Standard_H16r'
  'Standard_H16mr'
  'Standard_HB120rs_v2'
  'Standard_HC44rs'
  'Standard_DC2s'
  'Standard_DC4s'
  'Standard_DC2s_v2'
  'Standard_DC4s_v2'
  'Standard_DC8s_v2'
  'Standard_DC16s_v2'
  'Standard_DC32s_v2'
  'Standard_A1_v2'
  'Standard_A2_v2'
  'Standard_A4_v2'
  'Standard_A8_v2'
  'Standard_A2m_v2'
  'Standard_A4m_v2'
  'Standard_A8m_v2'
])
param mediaNodeInstanceType string = 'Standard_B2s'

@description('Username for the Virtual Machine.')
param adminUsername string

@description('SSH Key for the Virtual Machine.')
@secure()
param adminSshKey object

@description('Number of initial media nodes to deploy')
param initialNumberOfMediaNodes int = 1

@description('Minimum number of media nodes to deploy')
param minNumberOfMediaNodes int = 1

@description('Maximum number of media nodes to deploy')
param maxNumberOfMediaNodes int = 5

@description('Target CPU percentage to scale up or down')
param scaleTargetCPU int = 50

param additionalInstallFlags string = ''

/*------------------------------------------- VARIABLES AND VALIDATIONS -------------------------------------------*/

var isEmptyIp = publicIpAddressObject.newOrExistingOrNone == 'none'

var isEmptyDomain = domainName == ''

var masterNodeVMSettings = {
  osDiskType: 'StandardSSD_LRS'
  osDiskSize: masterNodesDiskSize
  ubuntuOSVersion: {
    publisher: 'Canonical'
    offer: '0001-com-ubuntu-server-jammy'
    sku: '22_04-lts-gen2'
    version: 'latest'
  }
  linuxConfiguration: {
    disablePasswordAuthentication: true
    ssh: {
      publicKeys: [
        {
          path: '/home/${adminUsername}/.ssh/authorized_keys'
          keyData: adminSshKey.sshPublicKey
        }
      ]
    }
  }
}

var mediaNodeVMSettings = {
  vmName: '${stackName}-VN-MediaNode'
  osDiskType: 'StandardSSD_LRS'
  ubuntuOSVersion: {
    publisher: 'Canonical'
    offer: '0001-com-ubuntu-server-jammy'
    sku: '22_04-lts-gen2'
    version: 'latest'
  }
  linuxConfiguration: {
    disablePasswordAuthentication: true
    ssh: {
      publicKeys: [
        {
          path: '/home/${adminUsername}/.ssh/authorized_keys'
          keyData: adminSshKey.sshPublicKey
        }
      ]
    }
  }
}

var turnTLSIsEnabled = turnDomainName != ''

var keyVaultName = '${stackName}-keyvault'

var location = resourceGroup().location

var tenantId = subscription().tenantId

var deploymentUser = az.deployer().objectId

/*------------------------------------------- KEY VAULT -------------------------------------------*/

resource openviduSharedInfo 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    enabledForDeployment: true
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    tenantId: tenantId
    enableSoftDelete: false
    accessPolicies: [
      {
        objectId: openviduMasterNode1.identity.principalId
        tenantId: tenantId
        permissions: {
          secrets: ['get', 'set', 'list']
        }
      }
      {
        objectId: openviduMasterNode2.identity.principalId
        tenantId: tenantId
        permissions: {
          secrets: ['get', 'set', 'list']
        }
      }
      {
        objectId: openviduMasterNode3.identity.principalId
        tenantId: tenantId
        permissions: {
          secrets: ['get', 'set', 'list']
        }
      }
      {
        objectId: openviduMasterNode4.identity.principalId
        tenantId: tenantId
        permissions: {
          secrets: ['get', 'set', 'list']
        }
      }
      {
        objectId: openviduScaleSetMediaNode.identity.principalId
        tenantId: tenantId
        permissions: {
          secrets: ['get']
        }
      }
      {
        objectId: deploymentUser
        tenantId: tenantId
        permissions: {
          secrets: ['get', 'list', 'set', 'delete', 'recover', 'backup', 'restore']
        }
      }
    ]
    sku: {
      name: 'standard'
      family: 'A'
    }
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

/*------------------------------------------- MASTER NODE -------------------------------------------*/

var stringInterpolationParamsMaster1 = {
  publicIPId: publicIPId
  domainName: domainName
  turnDomainName: turnDomainName
  certificateType: certificateType
  ownPublicCertificate: ownPublicCertificate
  ownPrivateCertificate: ownPrivateCertificate
  turnOwnPublicCertificate: turnOwnPublicCertificate
  turnOwnPrivateCertificate: turnOwnPrivateCertificate
  openviduLicense: openviduLicense
  rtcEngine: rtcEngine
  keyVaultName: keyVaultName
  masterNodeNum: '1'
  additionalInstallFlags: additionalInstallFlags
}

var stringInterpolationParamsMaster2 = {
  publicIPId: publicIPId
  domainName: domainName
  turnDomainName: turnDomainName
  certificateType: certificateType
  ownPublicCertificate: ownPublicCertificate
  ownPrivateCertificate: ownPrivateCertificate
  turnOwnPublicCertificate: turnOwnPublicCertificate
  turnOwnPrivateCertificate: turnOwnPrivateCertificate
  openviduLicense: openviduLicense
  rtcEngine: rtcEngine
  keyVaultName: keyVaultName
  masterNodeNum: '2'
  additionalInstallFlags: additionalInstallFlags
}

var stringInterpolationParamsMaster3 = {
  publicIPId: publicIPId
  domainName: domainName
  turnDomainName: turnDomainName
  certificateType: certificateType
  ownPublicCertificate: ownPublicCertificate
  ownPrivateCertificate: ownPrivateCertificate
  turnOwnPublicCertificate: turnOwnPublicCertificate
  turnOwnPrivateCertificate: turnOwnPrivateCertificate
  openviduLicense: openviduLicense
  rtcEngine: rtcEngine
  keyVaultName: keyVaultName
  masterNodeNum: '3'
  additionalInstallFlags: additionalInstallFlags
}

var stringInterpolationParamsMaster4 = {
  publicIPId: publicIPId
  domainName: domainName
  turnDomainName: turnDomainName
  certificateType: certificateType
  ownPublicCertificate: ownPublicCertificate
  ownPrivateCertificate: ownPrivateCertificate
  turnOwnPublicCertificate: turnOwnPublicCertificate
  turnOwnPrivateCertificate: turnOwnPrivateCertificate
  openviduLicense: openviduLicense
  rtcEngine: rtcEngine
  keyVaultName: keyVaultName
  masterNodeNum: '4'
  additionalInstallFlags: additionalInstallFlags
}

var installScriptTemplateMaster = '''
#!/bin/bash -x
set -e
OPENVIDU_VERSION=main
DOMAIN=

# Assume azure cli is installed

apt-get update && apt-get install -y \
  curl \
  unzip \
  jq \
  wget


# Wait for the keyvault availability
MAX_WAIT=100
WAIT_INTERVAL=1
ELAPSED_TIME=0
set +e
while true; do
  # Check keyvault availability
  az keyvault secret list --vault-name ${keyVaultName} 

  # If it is available, exit the loop
  if [ $? -eq 0 ]; then
    break
  fi

  # If not, wait and check again incrementing the time
  ELAPSED_TIME=$((ELAPSED_TIME + WAIT_INTERVAL))

  # If exceeded the maximum time, exit with error
  if [ $ELAPSED_TIME -ge $MAX_WAIT ]; then
    exit 1
  fi

  # Esperar antes de la próxima comprobación
  sleep $WAIT_INTERVAL
done
set -e

MASTER_NODE_NUM=${masterNodeNum}

# Get own private IP
PRIVATE_IP=$(curl -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/privateIpAddress?api-version=2017-08-01&format=text")

# Store current private IP
PRIVATE_IP="$(/usr/local/bin/store_secret.sh save MASTER-NODE-${masterNodeNum}-PRIVATE-IP $PRIVATE_IP)"


if [[ $MASTER_NODE_NUM -eq 1 ]] && [[ "$ALL_SECRETS_GENERATED" == "" || "$ALL_SECRETS_GENERATED" == "false" ]]; then

  # Configure Domain name
  if [[ "${domainName}" == '' ]]; then
    # Get public IP using the get_public_ip.sh script
    PUBLIC_IP=$(/usr/local/bin/get_public_ip.sh 2>/dev/null)
    if [[ $? -ne 0 || -z "${PUBLIC_IP}" ]]; then
      echo "Could not determine public IP."
      exit 1
    fi

    RANDOM_DOMAIN_STRING=$(tr -dc 'a-z' < /dev/urandom | head -c 8)
    DOMAIN="openvidu-$RANDOM_DOMAIN_STRING-$(echo "$PUBLIC_IP" | tr '.' '-').sslip.io"
    TURN_DOMAIN_NAME_SSLIP_IO="turn-$RANDOM_DOMAIN_STRING-$(echo "$PUBLIC_IP" | tr '.' '-').sslip.io"
  else
    DOMAIN=${domainName}
  fi
  DOMAIN="$(/usr/local/bin/store_secret.sh save DOMAIN-NAME "${domainName}")"

  # Configure TURN server domain name
  if [[ -n "${turnDomainName}" ]]; then
    LIVEKIT_TURN_DOMAIN_NAME="$(/usr/local/bin/store_secret.sh save LIVEKIT-TURN-DOMAIN-NAME "${turnDomainName}")"
  elif [[ "${TURN_DOMAIN_NAME_SSLIP_IO}" != '' ]]; then
    LIVEKIT_TURN_DOMAIN_NAME=$(/usr/local/bin/store_secret.sh save LIVEKIT-TURN-DOMAIN-NAME "${TURN_DOMAIN_NAME_SSLIP_IO}")
    COMMON_ARGS+=(
      "--turn-domain-name=$LIVEKIT_TURN_DOMAIN_NAME"
    )
  fi

  # Store usernames and generate random passwords
  OPENVIDU_PRO_LICENSE="$(/usr/local/bin/store_secret.sh save OPENVIDU-PRO-LICENSE "${openviduLicense}")"
  OPENVIDU_RTC_ENGINE="$(/usr/local/bin/store_secret.sh save OPENVIDU-RTC-ENGINE "${rtcEngine}")"
  REDIS_PASSWORD="$(/usr/local/bin/store_secret.sh generate REDIS-PASSWORD)"
  MONGO_ADMIN_USERNAME="$(/usr/local/bin/store_secret.sh save MONGO-ADMIN-USERNAME "mongoadmin")"
  MONGO_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate MONGO-ADMIN-PASSWORD)"
  MONGO_REPLICA_SET_KEY="$(/usr/local/bin/store_secret.sh generate MONGO-REPLICA-SET-KEY)"
  MINIO_ACCESS_KEY="$(/usr/local/bin/store_secret.sh save MINIO-ACCESS-KEY "minioadmin")"
  MINIO_SECRET_KEY="$(/usr/local/bin/store_secret.sh generate MINIO-SECRET-KEY)"
  DASHBOARD_ADMIN_USERNAME="$(/usr/local/bin/store_secret.sh save DASHBOARD-ADMIN-USERNAME "dashboardadmin")"
  DASHBOARD_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate DASHBOARD-ADMIN-PASSWORD)"
  GRAFANA_ADMIN_USERNAME="$(/usr/local/bin/store_secret.sh save GRAFANA-ADMIN-USERNAME "grafanaadmin")"
  GRAFANA_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate GRAFANA-ADMIN-PASSWORD)"
  MEET_INITIAL_ADMIN_USER="$(/usr/local/bin/store_secret.sh save MEET-INITIAL-ADMIN-USER "admin")"
  MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate MEET-INITIAL-ADMIN-PASSWORD)"
  MEET_INITIAL_API_KEY="$(/usr/local/bin/store_secret.sh generate MEET-INITIAL-API-KEY)"
  LIVEKIT_API_KEY="$(/usr/local/bin/store_secret.sh generate LIVEKIT-API-KEY "API" 12)"
  LIVEKIT_API_SECRET="$(/usr/local/bin/store_secret.sh generate LIVEKIT-API-SECRET)"
  OPENVIDU_VERSION="$(/usr/local/bin/store_secret.sh save OPENVIDU-VERSION "${OPENVIDU_VERSION}")"
  ENABLED_MODULES="$(/usr/local/bin/store_secret.sh save ENABLED-MODULES "observability,openviduMeet,v2compatibility")"
  ALL_SECRETS_GENERATED="$(/usr/local/bin/store_secret.sh save ALL-SECRETS-GENERATED "true")"
fi

while true; do
  MASTER_NODE_1_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-1-PRIVATE-IP --query value -o tsv) || true
  MASTER_NODE_2_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-2-PRIVATE-IP --query value -o tsv) || true
  MASTER_NODE_3_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-3-PRIVATE-IP --query value -o tsv) || true
  MASTER_NODE_4_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-4-PRIVATE-IP --query value -o tsv) || true
  # Check if all master nodes have stored their private IPs
  if [[ "$MASTER_NODE_1_PRIVATE_IP" != "" ]] &&
      [[ "$MASTER_NODE_2_PRIVATE_IP" != "" ]] &&
      [[ "$MASTER_NODE_3_PRIVATE_IP" != "" ]] &&
      [[ "$MASTER_NODE_4_PRIVATE_IP" != "" ]]; then
    break
  fi
    sleep 5
done


# Fetch the values in the keyvault
MASTER_NODE_1_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-1-PRIVATE-IP --query value -o tsv)
MASTER_NODE_2_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-2-PRIVATE-IP --query value -o tsv)
MASTER_NODE_3_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-3-PRIVATE-IP --query value -o tsv)
MASTER_NODE_4_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-4-PRIVATE-IP --query value -o tsv)
MASTER_NODE_PRIVATE_IP_LIST="$MASTER_NODE_1_PRIVATE_IP,$MASTER_NODE_2_PRIVATE_IP,$MASTER_NODE_3_PRIVATE_IP,$MASTER_NODE_4_PRIVATE_IP"

DOMAIN=$(az keyvault secret show --vault-name ${keyVaultName} --name DOMAIN-NAME --query value -o tsv)
if [[ -n "${turnDomainName}" ]]; then
  LIVEKIT_TURN_DOMAIN_NAME=$(az keyvault secret show --vault-name ${keyVaultName} --name LIVEKIT-TURN-DOMAIN-NAME --query value -o tsv)
fi
OPENVIDU_RTC_ENGINE=$(az keyvault secret show --vault-name ${keyVaultName} --name OPENVIDU-RTC-ENGINE --query value -o tsv)
OPENVIDU_PRO_LICENSE=$(az keyvault secret show --vault-name ${keyVaultName} --name OPENVIDU-PRO-LICENSE --query value -o tsv)
REDIS_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name REDIS-PASSWORD --query value -o tsv)
MONGO_ADMIN_USERNAME=$(az keyvault secret show --vault-name ${keyVaultName} --name MONGO-ADMIN-USERNAME --query value -o tsv)
MONGO_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name MONGO-ADMIN-PASSWORD --query value -o tsv)
MONGO_REPLICA_SET_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MONGO-REPLICA-SET-KEY --query value -o tsv)
DASHBOARD_ADMIN_USERNAME=$(az keyvault secret show --vault-name ${keyVaultName} --name DASHBOARD-ADMIN-USERNAME --query value -o tsv)
DASHBOARD_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name DASHBOARD-ADMIN-PASSWORD --query value -o tsv)
MINIO_ACCESS_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MINIO-ACCESS-KEY --query value -o tsv)
MINIO_SECRET_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MINIO-SECRET-KEY --query value -o tsv)
GRAFANA_ADMIN_USERNAME=$(az keyvault secret show --vault-name ${keyVaultName} --name GRAFANA-ADMIN-USERNAME --query value -o tsv)
GRAFANA_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name GRAFANA-ADMIN-PASSWORD --query value -o tsv)
LIVEKIT_API_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name LIVEKIT-API-KEY --query value -o tsv)
LIVEKIT_API_SECRET=$(az keyvault secret show --vault-name ${keyVaultName} --name LIVEKIT-API-SECRET --query value -o tsv)
MEET_INITIAL_ADMIN_USER=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-INITIAL-ADMIN-USER --query value -o tsv)
MEET_INITIAL_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-INITIAL-ADMIN-PASSWORD --query value -o tsv)
MEET_INITIAL_API_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-INITIAL-API-KEY --query value -o tsv)
ENABLED_MODULES=$(az keyvault secret show --vault-name ${keyVaultName} --name ENABLED-MODULES --query value -o tsv)


# Base command
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/ha/$OPENVIDU_VERSION/install_ov_master_node.sh)"

# Common arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=azure"
  "--deployment-type='ha'"
  "--node-role='master-node'"
  "--external-load-balancer"
  "--internal-tls-termination"
  "--master-node-private-ip-list='$MASTER_NODE_PRIVATE_IP_LIST'"
  "--openvidu-pro-license='$OPENVIDU_PRO_LICENSE'"
  "--domain-name='$DOMAIN'"
  "--enabled-modules='$ENABLED_MODULES'"
  "--rtc-engine=$OPENVIDU_RTC_ENGINE"
  "--redis-password=$REDIS_PASSWORD"
  "--mongo-admin-user=$MONGO_ADMIN_USERNAME"
  "--mongo-admin-password=$MONGO_ADMIN_PASSWORD"
  "--mongo-replica-set-key=$MONGO_REPLICA_SET_KEY"
  "--minio-access-key=$MINIO_ACCESS_KEY"
  "--minio-secret-key=$MINIO_SECRET_KEY"
  "--dashboard-admin-user=$DASHBOARD_ADMIN_USERNAME"
  "--dashboard-admin-password=$DASHBOARD_ADMIN_PASSWORD"
  "--grafana-admin-user=$GRAFANA_ADMIN_USERNAME"
  "--grafana-admin-password=$GRAFANA_ADMIN_PASSWORD"
  "--meet-initial-admin-user=$MEET_INITIAL_ADMIN_USER"
  "--meet-initial-admin-password=$MEET_INITIAL_ADMIN_PASSWORD"
  "--meet-initial-api-key=$MEET_INITIAL_API_KEY"
  "--livekit-api-key=$LIVEKIT_API_KEY"
  "--livekit-api-secret=$LIVEKIT_API_SECRET"
)

# Include additional installer flags provided by the user
if [[ "${additionalInstallFlags}" != "" ]]; then
  IFS=',' read -ra EXTRA_FLAGS <<< "${additionalInstallFlags}"
  for extra_flag in "${EXTRA_FLAGS[@]}"; do
    # Trim whitespace around each flag
    extra_flag="$(echo -e "${extra_flag}" | sed -e 's/^[ \t]*//' -e 's/[ \t]*$//')"
    if [[ "$extra_flag" != "" ]]; then
      COMMON_ARGS+=("$extra_flag")
    fi
  done
fi

if [[ $LIVEKIT_TURN_DOMAIN_NAME != "" ]]; then
  COMMON_ARGS+=("--turn-domain-name=$LIVEKIT_TURN_DOMAIN_NAME")
fi

# Certificate arguments
if [[ "${certificateType}" == "selfsigned" ]]; then
  CERT_ARGS=(
    "--certificate-type=selfsigned"
  )
elif [[ "${certificateType}" == "letsencrypt" ]]; then
  CERT_ARGS=(
    "--certificate-type=letsencrypt"
  )
else
  # Download owncert files
  mkdir -p /tmp/owncert
  wget -O /tmp/owncert/fullchain.pem ${ownPublicCertificate}
  wget -O /tmp/owncert/privkey.pem ${ownPrivateCertificate}

  # Convert to base64
  OWN_CERT_CRT=$(base64 -w 0 /tmp/owncert/fullchain.pem)
  OWN_CERT_KEY=$(base64 -w 0 /tmp/owncert/privkey.pem)

  CERT_ARGS=(
    "--certificate-type=owncert"
    "--owncert-public-key=$OWN_CERT_CRT"
    "--owncert-private-key=$OWN_CERT_KEY"
  )

  # Turn with TLS and own certificate
  if [[ "${turnDomainName}" != '' ]]; then
    # Download owncert files
    mkdir -p /tmp/owncert-turn
    wget -O /tmp/owncert-turn/fullchain.pem ${turnOwnPublicCertificate}
    wget -O /tmp/owncert-turn/privkey.pem ${turnOwnPrivateCertificate}

    # Convert to base64
    OWN_CERT_CRT_TURN=$(base64 -w 0 /tmp/owncert-turn/fullchain.pem)
    OWN_CERT_KEY_TURN=$(base64 -w 0 /tmp/owncert-turn/privkey.pem)

    CERT_ARGS+=(
      "--turn-owncert-private-key=$OWN_CERT_KEY_TURN"
      "--turn-owncert-public-key=$OWN_CERT_CRT_TURN"
    )
  fi
fi

# Construct the final command
FINAL_COMMAND="$INSTALL_COMMAND $(printf "%s " "${COMMON_ARGS[@]}") $(printf "%s " "${CERT_ARGS[@]}")"

# Install OpenVidu
exec bash -c "$FINAL_COMMAND"    
'''

var after_installScriptTemplateMaster = '''
#!/bin/bash
set -e

az login --identity --allow-no-subscriptions > /dev/null

# Generate URLs
DOMAIN=$(az keyvault secret show --vault-name ${keyVaultName} --name DOMAIN-NAME --query value -o tsv)
DASHBOARD_URL="https://${DOMAIN}/dashboard/"
GRAFANA_URL="https://${DOMAIN}/grafana/"
MINIO_URL="https://${DOMAIN}/minio-console/"

# Update shared secret
az keyvault secret set --vault-name ${keyVaultName} --name DOMAIN-NAME --value $DOMAIN
az keyvault secret set --vault-name ${keyVaultName} --name DASHBOARD-URL --value $DASHBOARD_URL
az keyvault secret set --vault-name ${keyVaultName} --name GRAFANA-URL --value $GRAFANA_URL
az keyvault secret set --vault-name ${keyVaultName} --name MINIO-URL --value $MINIO_URL

az keyvault secret show --vault-name ${keyVaultName} --name MINIO-URL

if [[ $? -ne 0 ]]; then
    echo "Error updating keyvault"
fi
'''
var update_config_from_secretScriptTemplateMaster = '''
#!/bin/bash
set -e

az login --identity --allow-no-subscriptions > /dev/null

# Installation directory
INSTALL_DIR="/opt/openvidu"
CLUSTER_CONFIG_DIR="${INSTALL_DIR}/config/cluster"
MASTER_NODE_CONFIG_DIR="${INSTALL_DIR}/config/node"

# Replace DOMAIN_NAME
export DOMAIN=$(az keyvault secret show --vault-name ${keyVaultName} --name DOMAIN-NAME --query value -o tsv)
if [[ -n "$DOMAIN" ]]; then
    sed -i "s/DOMAIN_NAME=.*/DOMAIN_NAME=$DOMAIN/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
else
    exit 1
fi

# Replace LIVEKIT_TURN_DOMAIN_NAME
export LIVEKIT_TURN_DOMAIN_NAME=$(az keyvault secret show --vault-name ${keyVaultName} --name LIVEKIT-TURN-DOMAIN-NAME --query value -o tsv)
if [[ -n "$LIVEKIT_TURN_DOMAIN_NAME" ]]; then
    sed -i "s/LIVEKIT_TURN_DOMAIN_NAME=.*/LIVEKIT_TURN_DOMAIN_NAME=$LIVEKIT_TURN_DOMAIN_NAME/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
fi

# Get the rest of the values
export REDIS_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name REDIS-PASSWORD --query value -o tsv)
export OPENVIDU_RTC_ENGINE=$(az keyvault secret show --vault-name ${keyVaultName} --name OPENVIDU-RTC-ENGINE --query value -o tsv)
export OPENVIDU_PRO_LICENSE=$(az keyvault secret show --vault-name ${keyVaultName} --name OPENVIDU-PRO-LICENSE --query value -o tsv)
export MONGO_ADMIN_USERNAME=$(az keyvault secret show --vault-name ${keyVaultName} --name MONGO-ADMIN-USERNAME --query value -o tsv)
export MONGO_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name MONGO-ADMIN-PASSWORD --query value -o tsv)
export MONGO_REPLICA_SET_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MONGO-REPLICA-SET-KEY --query value -o tsv)
export DASHBOARD_ADMIN_USERNAME=$(az keyvault secret show --vault-name ${keyVaultName} --name DASHBOARD-ADMIN-USERNAME --query value -o tsv)
export DASHBOARD_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name DASHBOARD-ADMIN-PASSWORD --query value -o tsv)
export MINIO_ACCESS_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MINIO-ACCESS-KEY --query value -o tsv)
export MINIO_SECRET_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MINIO-SECRET-KEY --query value -o tsv)
export GRAFANA_ADMIN_USERNAME=$(az keyvault secret show --vault-name ${keyVaultName} --name GRAFANA-ADMIN-USERNAME --query value -o tsv)
export GRAFANA_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name GRAFANA-ADMIN-PASSWORD --query value -o tsv)
export LIVEKIT_API_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name LIVEKIT-API-KEY --query value -o tsv)
export LIVEKIT_API_SECRET=$(az keyvault secret show --vault-name ${keyVaultName} --name LIVEKIT-API-SECRET --query value -o tsv)
export MEET_INITIAL_ADMIN_USER=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-INITIAL-ADMIN-USER --query value -o tsv)
export MEET_INITIAL_ADMIN_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-INITIAL-ADMIN-PASSWORD --query value -o tsv)
export MEET_INITIAL_API_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-INITIAL-API-KEY --query value -o tsv)
export ENABLED_MODULES=$(az keyvault secret show --vault-name ${keyVaultName} --name ENABLED-MODULES --query value -o tsv)

# Replace rest of the values
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "${MASTER_NODE_CONFIG_DIR}/master_node.env"
sed -i "s/OPENVIDU_RTC_ENGINE=.*/OPENVIDU_RTC_ENGINE=$OPENVIDU_RTC_ENGINE/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/OPENVIDU_PRO_LICENSE=.*/OPENVIDU_PRO_LICENSE=$OPENVIDU_PRO_LICENSE/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_ADMIN_USERNAME=.*/MONGO_ADMIN_USERNAME=$MONGO_ADMIN_USERNAME/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_ADMIN_PASSWORD=.*/MONGO_ADMIN_PASSWORD=$MONGO_ADMIN_PASSWORD/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_REPLICA_SET_KEY=.*/MONGO_REPLICA_SET_KEY=$MONGO_REPLICA_SET_KEY/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/DASHBOARD_ADMIN_USERNAME=.*/DASHBOARD_ADMIN_USERNAME=$DASHBOARD_ADMIN_USERNAME/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/DASHBOARD_ADMIN_PASSWORD=.*/DASHBOARD_ADMIN_PASSWORD=$DASHBOARD_ADMIN_PASSWORD/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MINIO_ACCESS_KEY=.*/MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MINIO_SECRET_KEY=.*/MINIO_SECRET_KEY=$MINIO_SECRET_KEY/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/GRAFANA_ADMIN_USERNAME=.*/GRAFANA_ADMIN_USERNAME=$GRAFANA_ADMIN_USERNAME/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/LIVEKIT_API_KEY=.*/LIVEKIT_API_KEY=$LIVEKIT_API_KEY/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/LIVEKIT_API_SECRET=.*/LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET/" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MEET_INITIAL_ADMIN_USER=.*/MEET_INITIAL_ADMIN_USER=$MEET_INITIAL_ADMIN_USER/" "${CLUSTER_CONFIG_DIR}/master_node/meet.env"
sed -i "s/MEET_INITIAL_ADMIN_PASSWORD=.*/MEET_INITIAL_ADMIN_PASSWORD=$MEET_INITIAL_ADMIN_PASSWORD/" "${CLUSTER_CONFIG_DIR}/master_node/meet.env"
sed -i "s/MEET_INITIAL_API_KEY=.*/MEET_INITIAL_API_KEY=$MEET_INITIAL_API_KEY/" "${CLUSTER_CONFIG_DIR}/master_node/meet.env"
sed -i "s/ENABLED_MODULES=.*/ENABLED_MODULES=$ENABLED_MODULES/" "${CLUSTER_CONFIG_DIR}/openvidu.env"

# Update URLs in secret
DASHBOARD_URL="https://${DOMAIN}/dashboard/"
GRAFANA_URL="https://${DOMAIN}/grafana/"
MINIO_URL="https://${DOMAIN}/minio-console/"

# Update shared secret
az keyvault secret set --vault-name ${keyVaultName} --name DOMAIN-NAME --value $DOMAIN
az keyvault secret set --vault-name ${keyVaultName} --name DASHBOARD-URL --value $DASHBOARD_URL
az keyvault secret set --vault-name ${keyVaultName} --name GRAFANA-URL --value $GRAFANA_URL
az keyvault secret set --vault-name ${keyVaultName} --name MINIO-URL --value $MINIO_URL
'''

var update_secret_from_configScriptTemplateMaster = '''
#!/bin/bash
set -e

az login --identity --allow-no-subscriptions > /dev/null

# Installation directory
INSTALL_DIR="/opt/openvidu"
CLUSTER_CONFIG_DIR="${INSTALL_DIR}/config/cluster"
MASTER_NODE_CONFIG_DIR="${INSTALL_DIR}/config/node"

# Get current values of the config
REDIS_PASSWORD="$(/usr/local/bin/get_value_from_config.sh REDIS_PASSWORD "${MASTER_NODE_CONFIG_DIR}/master_node.env")"
DOMAIN_NAME="$(/usr/local/bin/get_value_from_config.sh DOMAIN_NAME "${CLUSTER_CONFIG_DIR}/openvidu.env")"
LIVEKIT_TURN_DOMAIN_NAME="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_TURN_DOMAIN_NAME "${CLUSTER_CONFIG_DIR}/openvidu.env")"
OPENVIDU_RTC_ENGINE="$(/usr/local/bin/get_value_from_config.sh OPENVIDU_RTC_ENGINE "${CLUSTER_CONFIG_DIR}/openvidu.env")"
OPENVIDU_PRO_LICENSE="$(/usr/local/bin/get_value_from_config.sh OPENVIDU_PRO_LICENSE "${CLUSTER_CONFIG_DIR}/openvidu.env")"
MONGO_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh MONGO_ADMIN_USERNAME "${CLUSTER_CONFIG_DIR}/openvidu.env")"
MONGO_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh MONGO_ADMIN_PASSWORD "${CLUSTER_CONFIG_DIR}/openvidu.env")"
MONGO_REPLICA_SET_KEY="$(/usr/local/bin/get_value_from_config.sh MONGO_REPLICA_SET_KEY "${CLUSTER_CONFIG_DIR}/openvidu.env")"
MINIO_ACCESS_KEY="$(/usr/local/bin/get_value_from_config.sh MINIO_ACCESS_KEY "${CLUSTER_CONFIG_DIR}/openvidu.env")"
MINIO_SECRET_KEY="$(/usr/local/bin/get_value_from_config.sh MINIO_SECRET_KEY "${CLUSTER_CONFIG_DIR}/openvidu.env")"
DASHBOARD_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh DASHBOARD_ADMIN_USERNAME "${CLUSTER_CONFIG_DIR}/openvidu.env")"
DASHBOARD_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh DASHBOARD_ADMIN_PASSWORD "${CLUSTER_CONFIG_DIR}/openvidu.env")"
GRAFANA_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh GRAFANA_ADMIN_USERNAME "${CLUSTER_CONFIG_DIR}/openvidu.env")"
GRAFANA_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh GRAFANA_ADMIN_PASSWORD "${CLUSTER_CONFIG_DIR}/openvidu.env")"
LIVEKIT_API_KEY="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_API_KEY "${CLUSTER_CONFIG_DIR}/openvidu.env")"
LIVEKIT_API_SECRET="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_API_SECRET "${CLUSTER_CONFIG_DIR}/openvidu.env")"
MEET_INITIAL_ADMIN_USER="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_ADMIN_USER "${CLUSTER_CONFIG_DIR}/master_node/meet.env")"
MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_ADMIN_PASSWORD "${CLUSTER_CONFIG_DIR}/master_node/meet.env")"
MEET_INITIAL_API_KEY="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_API_KEY "${CLUSTER_CONFIG_DIR}/master_node/meet.env")"
ENABLED_MODULES="$(/usr/local/bin/get_value_from_config.sh ENABLED_MODULES "${CLUSTER_CONFIG_DIR}/openvidu.env")"

# Update shared secret
az keyvault secret set --vault-name ${keyVaultName} --name REDIS-PASSWORD --value $REDIS_PASSWORD
az keyvault secret set --vault-name ${keyVaultName} --name DOMAIN-NAME --value $DOMAIN_NAME
az keyvault secret set --vault-name ${keyVaultName} --name LIVEKIT-TURN-DOMAIN-NAME --value $LIVEKIT_TURN_DOMAIN_NAME
az keyvault secret set --vault-name ${keyVaultName} --name OPENVIDU-RTC-ENGINE --value $OPENVIDU_RTC_ENGINE
az keyvault secret set --vault-name ${keyVaultName} --name OPENVIDU-PRO-LICENSE --value $OPENVIDU_PRO_LICENSE
az keyvault secret set --vault-name ${keyVaultName} --name MONGO-ADMIN-USERNAME --value $MONGO_ADMIN_USERNAME
az keyvault secret set --vault-name ${keyVaultName} --name MONGO-ADMIN-PASSWORD --value $MONGO_ADMIN_PASSWORD
az keyvault secret set --vault-name ${keyVaultName} --name MONGO-REPLICA-SET-KEY --value $MONGO_REPLICA_SET_KEY
az keyvault secret set --vault-name ${keyVaultName} --name MINIO-ACCESS-KEY --value $MINIO_ACCESS_KEY
az keyvault secret set --vault-name ${keyVaultName} --name MINIO-SECRET-KEY --value $MINIO_SECRET_KEY
az keyvault secret set --vault-name ${keyVaultName} --name DASHBOARD-ADMIN-USERNAME --value $DASHBOARD_ADMIN_USERNAME
az keyvault secret set --vault-name ${keyVaultName} --name DASHBOARD-ADMIN-PASSWORD --value $DASHBOARD_ADMIN_PASSWORD
az keyvault secret set --vault-name ${keyVaultName} --name GRAFANA-ADMIN-USERNAME --value $GRAFANA_ADMIN_USERNAME
az keyvault secret set --vault-name ${keyVaultName} --name GRAFANA-ADMIN-PASSWORD --value $GRAFANA_ADMIN_PASSWORD
az keyvault secret set --vault-name ${keyVaultName} --name LIVEKIT-API-KEY --value $LIVEKIT_API_KEY
az keyvault secret set --vault-name ${keyVaultName} --name LIVEKIT-API-SECRET --value $LIVEKIT_API_SECRET
az keyvault secret set --vault-name ${keyVaultName} --name MEET-INITIAL-ADMIN-USER --value $MEET_INITIAL_ADMIN_USER
az keyvault secret set --vault-name ${keyVaultName} --name MEET-INITIAL-ADMIN-PASSWORD --value $MEET_INITIAL_ADMIN_PASSWORD
az keyvault secret set --vault-name ${keyVaultName} --name MEET-INITIAL-API-KEY --value $MEET_INITIAL_API_KEY
az keyvault secret set --vault-name ${keyVaultName} --name ENABLED-MODULES --value $ENABLED_MODULES
'''

var get_value_from_configScriptMaster = '''
#!/bin/bash
set -e

# Function to get the value of a given key from the environment file
get_value() {
    local key="$1"
    local file_path="$2"

    # Use grep to find the line with the key, ignoring lines starting with #
    # Use awk to split on '=' and print the second field, which is the value
    local value=$(grep -E "^\s*$key\s*=" "$file_path" | awk -F= '{print $2}' | sed 's/#.*//; s/^\s*//; s/\s*$//')

    # If the value is empty, return "none"
    if [ -z "$value" ]; then
        echo "none"
    else
        echo "$value"
    fi
}

# Check if the correct number of arguments are supplied
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <key> <file_path>"
    exit 1
fi

# Get the key and file path from the arguments
key="$1"
file_path="$2"

# Get and print the value
get_value "$key" "$file_path"
'''

var store_secretScriptTemplateMaster = '''
#!/bin/bash
set -e

az login --identity --allow-no-subscriptions > /dev/null

# Modes: save, generate
# save mode: save the secret in the secret manager
# generate mode: generate a random password and save it in the secret manager
MODE="$1"

if [[ "$MODE" == "generate" ]]; then
    SECRET_KEY_NAME="$2"
    PREFIX="${3:-}"
    LENGTH="${4:-44}"
    RANDOM_PASSWORD="$(openssl rand -base64 64 | tr -d '+/=\n' | cut -c -${LENGTH})"
    RANDOM_PASSWORD="${PREFIX}${RANDOM_PASSWORD}"
    az keyvault secret set --vault-name ${keyVaultName} --name $SECRET_KEY_NAME --value $RANDOM_PASSWORD > /dev/null
    if [[ $? -ne 0 ]]; then
        echo "Error generating secret"
    fi
    echo "$RANDOM_PASSWORD"
elif [[ "$MODE" == "save" ]]; then
    SECRET_KEY_NAME="$2"
    SECRET_VALUE="$3"
    az keyvault secret set --vault-name ${keyVaultName} --name $SECRET_KEY_NAME --value $SECRET_VALUE > /dev/null
    if [[ $? -ne 0 ]]; then
        echo "Error generating secret"
    fi
    echo "$SECRET_VALUE"
else
    exit 1
fi
'''

var get_public_ip = '''
#!/bin/bash
az login --identity --allow-no-subscriptions > /dev/null

az network public-ip show \
  --id ${publicIPId} \
  --query "ipAddress" -o tsv
'''

var check_app_readyScriptMaster = '''
#!/bin/bash
set -e
while true; do
  HTTP_STATUS=$(curl -Ik http://localhost:7880/twirp/health | head -n1 | awk '{print $2}')
  if [ $HTTP_STATUS == 200 ]; then
    break
  fi
  sleep 5
done
'''

var restartScriptMaster = '''
#!/bin/bash
set -e
# Stop all services
systemctl stop openvidu

# Update config from secret
/usr/local/bin/update_config_from_secret.sh

# Start all services
systemctl start openvidu
'''

var config_blobStorageTemplate = '''
#!/bin/bash
set -e

# Install dir and config dir
INSTALL_DIR="/opt/openvidu"
CLUSTER_CONFIG_DIR="${INSTALL_DIR}/config/cluster"

az login --identity

# Config azure blob storage
AZURE_ACCOUNT_NAME="${storageAccountName}"
AZURE_ACCOUNT_KEY=$(az storage account keys list --account-name ${storageAccountName} --query '[0].value' -o tsv)
AZURE_CONTAINER_NAME="${storageAccountContainerName}"

sed -i "s|AZURE_ACCOUNT_NAME=.*|AZURE_ACCOUNT_NAME=$AZURE_ACCOUNT_NAME|" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|AZURE_ACCOUNT_KEY=.*|AZURE_ACCOUNT_KEY=$AZURE_ACCOUNT_KEY|" "${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|AZURE_CONTAINER_NAME=.*|AZURE_CONTAINER_NAME=$AZURE_CONTAINER_NAME|" "${CLUSTER_CONFIG_DIR}/openvidu.env"
'''

var installScriptMaster1 = reduce(
  items(stringInterpolationParamsMaster1),
  { value: installScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var installScriptMaster2 = reduce(
  items(stringInterpolationParamsMaster2),
  { value: installScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var installScriptMaster3 = reduce(
  items(stringInterpolationParamsMaster3),
  { value: installScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var installScriptMaster4 = reduce(
  items(stringInterpolationParamsMaster4),
  { value: installScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var after_installScriptMaster = reduce(
  items(stringInterpolationParamsMaster1),
  { value: after_installScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var update_config_from_secretScriptMaster = reduce(
  items(stringInterpolationParamsMaster1),
  { value: update_config_from_secretScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var get_public_ip_script = reduce(
  items(stringInterpolationParamsMaster1),
  { value: get_public_ip},
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var update_secret_from_configScriptMaster = reduce(
  items(stringInterpolationParamsMaster1),
  { value: update_secret_from_configScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var store_secretScriptMaster = reduce(
  items(stringInterpolationParamsMaster1),
  { value: store_secretScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var blobStorageParams = {
  storageAccountName: isEmptyStorageAccountName ? storageAccount.name : existingStorageAccount.name
  storageAccountKey: listKeys(storageAccount.id, '2021-04-01').keys[0].value
  storageAccountContainerName: isEmptyAppDataContainerName ? 'openvidu-appdata' : '${appDataContainerName}'
  storageAccountClusterContainerName: isEmptyClusterContainerName
    ? 'openvidu-clusterdata'
    : '${clusterDataContainerName}'
}

var config_blobStorageScript = reduce(
  items(blobStorageParams),
  { value: config_blobStorageTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var base64installMaster1 = base64(installScriptMaster1)
var base64installMaster2 = base64(installScriptMaster2)
var base64installMaster3 = base64(installScriptMaster3)
var base64installMaster4 = base64(installScriptMaster4)
var base64after_installMaster = base64(after_installScriptMaster)
var base64get_public_ip = base64(get_public_ip_script)
var base64update_config_from_secretMaster = base64(update_config_from_secretScriptMaster)
var base64update_secret_from_configMaster = base64(update_secret_from_configScriptMaster)
var base64get_value_from_configMaster = base64(get_value_from_configScriptMaster)
var base64store_secretMaster = base64(store_secretScriptMaster)
var base64check_app_readyMaster = base64(check_app_readyScriptMaster)
var base64restartMaster = base64(restartScriptMaster)
var base64config_blobStorage = base64(config_blobStorageScript)

var userDataParamsMasterNode1 = {
  base64install: base64installMaster1
  base64after_install: base64after_installMaster
  base64get_public_ip: base64get_public_ip
  base64update_config_from_secret: base64update_config_from_secretMaster
  base64update_secret_from_config: base64update_secret_from_configMaster
  base64get_value_from_config: base64get_value_from_configMaster
  base64store_secret: base64store_secretMaster
  base64check_app_ready: base64check_app_readyMaster
  base64restart: base64restartMaster
  keyVaultName: keyVaultName
  masterNodeNum: '1'
  base64config_blobStorage: base64config_blobStorage
}

var userDataParamsMasterNode2 = {
  base64install: base64installMaster2
  base64after_install: base64after_installMaster
  base64get_public_ip: base64get_public_ip
  base64update_config_from_secret: base64update_config_from_secretMaster
  base64update_secret_from_config: base64update_secret_from_configMaster
  base64get_value_from_config: base64get_value_from_configMaster
  base64store_secret: base64store_secretMaster
  base64check_app_ready: base64check_app_readyMaster
  base64restart: base64restartMaster
  keyVaultName: keyVaultName
  masterNodeNum: '2'
  base64config_blobStorage: base64config_blobStorage
}

var userDataParamsMasterNode3 = {
  base64install: base64installMaster3
  base64after_install: base64after_installMaster
  base64get_public_ip: base64get_public_ip
  base64update_config_from_secret: base64update_config_from_secretMaster
  base64update_secret_from_config: base64update_secret_from_configMaster
  base64get_value_from_config: base64get_value_from_configMaster
  base64store_secret: base64store_secretMaster
  base64check_app_ready: base64check_app_readyMaster
  base64restart: base64restartMaster
  keyVaultName: keyVaultName
  masterNodeNum: '3'
  base64config_blobStorage: base64config_blobStorage
}

var userDataParamsMasterNode4 = {
  base64install: base64installMaster4
  base64after_install: base64after_installMaster
  base64get_public_ip: base64get_public_ip
  base64update_config_from_secret: base64update_config_from_secretMaster
  base64update_secret_from_config: base64update_secret_from_configMaster
  base64get_value_from_config: base64get_value_from_configMaster
  base64store_secret: base64store_secretMaster
  base64check_app_ready: base64check_app_readyMaster
  base64restart: base64restartMaster
  keyVaultName: keyVaultName
  masterNodeNum: '4'
  storageAccountName: isEmptyStorageAccountName ? storageAccount.name : existingStorageAccount.name
  base64config_blobStorage: base64config_blobStorage
}

var userDataTemplateMasterNode = '''
#!/bin/bash -x
set -eu -o pipefail

# Introduce the scripts in the instance
# install.sh
echo ${base64install} | base64 -d > /usr/local/bin/install.sh
chmod +x /usr/local/bin/install.sh

# after_install.sh
echo ${base64after_install} | base64 -d > /usr/local/bin/after_install.sh
chmod +x /usr/local/bin/after_install.sh

# get_public_ip.sh
echo ${base64get_public_ip} | base64 -d > /usr/local/bin/get_public_ip.sh
chmod +x /usr/local/bin/get_public_ip.sh

# update_config_from_secret.sh
echo ${base64update_config_from_secret} | base64 -d > /usr/local/bin/update_config_from_secret.sh
chmod +x /usr/local/bin/update_config_from_secret.sh

# update_secret_from_config.sh
echo ${base64update_secret_from_config} | base64 -d > /usr/local/bin/update_secret_from_config.sh
chmod +x /usr/local/bin/update_secret_from_config.sh

# get_value_from_config.sh
echo ${base64get_value_from_config} | base64 -d > /usr/local/bin/get_value_from_config.sh
chmod +x /usr/local/bin/get_value_from_config.sh

# store_secret.sh
echo ${base64store_secret} | base64 -d > /usr/local/bin/store_secret.sh
chmod +x /usr/local/bin/store_secret.sh

# check_app_ready.sh
echo ${base64check_app_ready} | base64 -d > /usr/local/bin/check_app_ready.sh
chmod +x /usr/local/bin/check_app_ready.sh

# restart.sh
echo ${base64restart} | base64 -d > /usr/local/bin/restart.sh
chmod +x /usr/local/bin/restart.sh

echo ${base64config_blobStorage} | base64 -d > /usr/local/bin/config_blobStorage.sh
chmod +x /usr/local/bin/config_blobStorage.sh

# Install azure cli
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

az login --identity --allow-no-subscriptions

apt-get update && apt-get install -y

export HOME="/root"

# Install OpenVidu
/usr/local/bin/install.sh || { echo "[OpenVidu] error installing OpenVidu"; exit 1; }

#Config blob storage
/usr/local/bin/config_blobStorage.sh || { echo "[OpenVidu] error configuring Blob Storage"; exit 1; }

# Start OpenVidu
systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; exit 1; }

# Update shared secret
/usr/local/bin/after_install.sh || { echo "[OpenVidu] error updating shared secret"; exit 1; }

# Launch on reboot
echo "@reboot /usr/local/bin/restart.sh >> /var/log/openvidu-restart.log" 2>&1 | crontab

MASTER_NODE_NUM=${masterNodeNum}
if [[ $MASTER_NODE_NUM -eq 4 ]]; then
  # Creating scale in lock
  set +e
  az storage blob upload --account-name ${storageAccountName} --container-name automation-locks --name lock.txt --file /dev/null --auth-mode key
  set -e

  #Finish all the nodes
  az keyvault secret set --vault-name ${keyVaultName} --name FINISH-MASTER-NODE --value "true"
fi

# Wait for the app
sleep 150
/usr/local/bin/check_app_ready.sh
'''

var userDataMasterNode1 = reduce(
  items(userDataParamsMasterNode1),
  { value: userDataTemplateMasterNode },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var userDataMasterNode2 = reduce(
  items(userDataParamsMasterNode2),
  { value: userDataTemplateMasterNode },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var userDataMasterNode3 = reduce(
  items(userDataParamsMasterNode3),
  { value: userDataTemplateMasterNode },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var userDataMasterNode4 = reduce(
  items(userDataParamsMasterNode4),
  { value: userDataTemplateMasterNode },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

resource openviduMasterNode1 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: '${stackName}-VM-MasterNode1'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    hardwareProfile: {
      vmSize: masterNodeInstanceType
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: masterNodeVMSettings.osDiskType
        }
        diskSizeGB: masterNodeVMSettings.osDiskSize
      }
      imageReference: masterNodeVMSettings.ubuntuOSVersion
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: netInterfaceMasterNode1.id
        }
      ]
    }
    osProfile: {
      computerName: '${stackName}-VM-MasterNode1'
      adminUsername: adminUsername
      linuxConfiguration: masterNodeVMSettings.linuxConfiguration
    }
    userData: base64(userDataMasterNode1)
  }
}

resource openviduMasterNode2 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: '${stackName}-VM-MasterNode2'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    hardwareProfile: {
      vmSize: masterNodeInstanceType
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: masterNodeVMSettings.osDiskType
        }
        diskSizeGB: masterNodeVMSettings.osDiskSize
      }
      imageReference: masterNodeVMSettings.ubuntuOSVersion
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: netInterfaceMasterNode2.id
        }
      ]
    }
    osProfile: {
      computerName: '${stackName}-VM-MasterNode2'
      adminUsername: adminUsername
      linuxConfiguration: masterNodeVMSettings.linuxConfiguration
    }
    userData: base64(userDataMasterNode2)
  }
  dependsOn: [openviduMasterNode1]
}

resource openviduMasterNode3 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: '${stackName}-VM-MasterNode3'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    hardwareProfile: {
      vmSize: masterNodeInstanceType
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: masterNodeVMSettings.osDiskType
        }
        diskSizeGB: masterNodeVMSettings.osDiskSize
      }
      imageReference: masterNodeVMSettings.ubuntuOSVersion
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: netInterfaceMasterNode3.id
        }
      ]
    }
    osProfile: {
      computerName: '${stackName}-VM-MasterNode3'
      adminUsername: adminUsername
      linuxConfiguration: masterNodeVMSettings.linuxConfiguration
    }
    userData: base64(userDataMasterNode3)
  }
  dependsOn: [openviduMasterNode2]
}

resource openviduMasterNode4 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: '${stackName}-VM-MasterNode4'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    hardwareProfile: {
      vmSize: masterNodeInstanceType
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: masterNodeVMSettings.osDiskType
        }
        diskSizeGB: masterNodeVMSettings.osDiskSize
      }
      imageReference: masterNodeVMSettings.ubuntuOSVersion
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: netInterfaceMasterNode4.id
        }
      ]
    }
    osProfile: {
      computerName: '${stackName}-VM-MasterNode4'
      adminUsername: adminUsername
      linuxConfiguration: masterNodeVMSettings.linuxConfiguration
    }
    userData: base64(userDataMasterNode4)
  }
  dependsOn: [openviduMasterNode3]
}

/*------------------------------------------- MEDIA NODES -------------------------------------------*/

var privateIPMasterNode1 = netInterfaceMasterNode1.properties.ipConfigurations[0].properties.privateIPAddress
var privateIPMasterNode2 = netInterfaceMasterNode2.properties.ipConfigurations[0].properties.privateIPAddress
var privateIPMasterNode3 = netInterfaceMasterNode3.properties.ipConfigurations[0].properties.privateIPAddress
var privateIPMasterNode4 = netInterfaceMasterNode4.properties.ipConfigurations[0].properties.privateIPAddress

var stringInterpolationParamsMedia = {
  privateIPMasterNode1: privateIPMasterNode1
  privateIPMasterNode2: privateIPMasterNode2
  privateIPMasterNode3: privateIPMasterNode3
  privateIPMasterNode4: privateIPMasterNode4
  keyVaultName: keyVaultName
}

var installScriptTemplateMedia = '''
#!/bin/bash -x
DOMAIN=

# Install dependencies
apt-get update && apt-get install -y \
  curl \
  unzip \
  jq \
  wget

# Get own private IP
PRIVATE_IP=$(curl -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/privateIpAddress?api-version=2017-08-01&format=text")

WAIT_INTERVAL=1
MAX_WAIT=10000
ELAPSED_TIME=0
set +e
while true; do
  # get secret value
  FINISH_MASTER_NODE=$(az keyvault secret show --vault-name ${keyVaultName} --name FINISH-MASTER-NODE --query value -o tsv)

  # Check if all master nodes finished
  if [ "$FINISH_MASTER_NODE" == "true" ]; then
    break
  fi

  ELAPSED_TIME=$((ELAPSED_TIME + WAIT_INTERVAL))

  # Check if the maximum waiting time has been reached
  if [ $ELAPSED_TIME -ge $MAX_WAIT ]; then
    exit 1
  fi

  sleep $WAIT_INTERVAL
done
set -e

MASTER_NODE_1_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-1-PRIVATE-IP --query value -o tsv)
MASTER_NODE_2_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-2-PRIVATE-IP --query value -o tsv)
MASTER_NODE_3_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-3-PRIVATE-IP --query value -o tsv)
MASTER_NODE_4_PRIVATE_IP=$(az keyvault secret show --vault-name ${keyVaultName} --name MASTER-NODE-4-PRIVATE-IP --query value -o tsv)
MASTER_NODE_PRIVATE_IP_LIST="$MASTER_NODE_1_PRIVATE_IP,$MASTER_NODE_2_PRIVATE_IP,$MASTER_NODE_3_PRIVATE_IP,$MASTER_NODE_4_PRIVATE_IP"
REDIS_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name REDIS-PASSWORD --query value -o tsv)
ENABLED_MODULES=$(az keyvault secret show --vault-name ${keyVaultName} --name ENABLED-MODULES --query value -o tsv)
OPENVIDU_VERSION=$(az keyvault secret show --vault-name ${keyVaultName} --name OPENVIDU-VERSION --query value -o tsv)

# Base command
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/ha/$OPENVIDU_VERSION/install_ov_media_node.sh)"

# Common arguments
COMMON_ARGS=(
"--no-tty"
"--install"
"--environment=azure"
"--deployment-type='ha'"
"--node-role='media-node'"
"--master-node-private-ip-list=$MASTER_NODE_PRIVATE_IP_LIST"
"--private-ip=$PRIVATE_IP"
"--enabled-modules='$ENABLED_MODULES'"
"--redis-password=$REDIS_PASSWORD"
)

# Construct the final command with all arguments
FINAL_COMMAND="$INSTALL_COMMAND $(printf "%s " "${COMMON_ARGS[@]}")"

# Install OpenVidu
exec bash -c "$FINAL_COMMAND"
'''

var stopMediaNodeParams = {
  subscriptionId: subscription().subscriptionId
  resourceGroupName: resourceGroup().name
  vmScaleSetName: '${stackName}-mediaNodeScaleSet'
  storageAccountName: isEmptyStorageAccountName ? storageAccount.name : existingStorageAccount.name
}

var stop_media_nodesScriptMediaTemplate = '''
#!/bin/bash
set -e

if ! (set -o noclobber ; echo > /tmp/global.lock) ; then
    exit 1  # the global.lock already exists
fi

# Execute if docker is installed
if [ -x "$(command -v docker)" ]; then

  echo "Stopping media node services and waiting for termination..."
  docker container kill --signal=SIGQUIT openvidu || true
  docker container kill --signal=SIGQUIT ingress || true
  docker container kill --signal=SIGQUIT egress || true
  for agent_container in $(docker ps --filter "label=openvidu-agent=true" --format '{{.Names}}'); do
    docker container kill --signal=SIGQUIT "$agent_container"
  done

  # Wait for running containers to not be openvidu, ingress or egress
  while [ $(docker ps --filter "label=openvidu-agent=true" -q | wc -l) -gt 0 ] || \
        [ $(docker inspect -f '{{.State.Running}}' openvidu 2>/dev/null) == "true" ] || \
        [ $(docker inspect -f '{{.State.Running}}' ingress 2>/dev/null) == "true" ] || \
        [ $(docker inspect -f '{{.State.Running}}' egress 2>/dev/null) == "true" ]; do
    echo "Waiting for containers to stop..."
    sleep 5
  done
fi

az login --identity

RESOURCE_GROUP_NAME=${resourceGroupName}
VM_SCALE_SET_NAME=${vmScaleSetName}
SUBSCRIPTION_ID=${subscriptionId}
BEFORE_INSTANCE_ID=$(curl -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | jq -r '.compute.resourceId')
INSTANCE_ID=$(echo $BEFORE_INSTANCE_ID | awk -F'/' '{print $NF}')
RESOURCE_ID=/subscriptions/$SUBSCRIPTION_ID/resourcegroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Compute/virtualMachineScaleSets/$VM_SCALE_SET_NAME

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
az tag update --resource-id $RESOURCE_ID --operation replace --tags "STATUS"="HEALTHY" "InstanceDeleteTime"="$TIMESTAMP" "storageAccount"="${storageAccountName}"

az vmss delete-instances --resource-group $RESOURCE_GROUP_NAME --name $VM_SCALE_SET_NAME --instance-ids $INSTANCE_ID
'''

var delete_mediaNode_ScriptMediaTemplate = '''
#!/bin/bash
set -e

az login --identity

RESOURCE_GROUP_NAME=${resourceGroupName}
VM_SCALE_SET_NAME=${vmScaleSetName}
BEFORE_INSTANCE_ID=$(curl -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | jq -r '.compute.resourceId')
INSTANCE_ID=$(echo $BEFORE_INSTANCE_ID | awk -F'/' '{print $NF}')


az vmss delete-instances --resource-group $RESOURCE_GROUP_NAME --name $VM_SCALE_SET_NAME --instance-ids $INSTANCE_ID
'''

var userDataMediaNodeTemplate = '''
#!/bin/bash -x
set -eu -o pipefail

# Introduce the scripts in the instance
# install.sh
echo ${base64install} | base64 -d > /usr/local/bin/install.sh
chmod +x /usr/local/bin/install.sh

# stop_media_nodes.sh
echo ${base64stop} | base64 -d > /usr/local/bin/stop_media_node.sh
chmod +x /usr/local/bin/stop_media_node.sh

apt-get update && apt-get install -y 
apt-get install -y jq

# Install azure cli
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

az login --identity

# Protect from scale in actions
RESOURCE_GROUP_NAME=${resourceGroupName}
VM_SCALE_SET_NAME=${vmScaleSetName}
BEFORE_INSTANCE_ID=$(curl -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | jq -r '.compute.resourceId')
INSTANCE_ID=$(echo $BEFORE_INSTANCE_ID | awk -F'/' '{print $NF}')
az vmss update --resource-group $RESOURCE_GROUP_NAME --name $VM_SCALE_SET_NAME --instance-id $INSTANCE_ID --protect-from-scale-in true

export HOME="/root"

# Install OpenVidu
/usr/local/bin/install.sh || { echo "[OpenVidu] error installing OpenVidu"; /usr/local/bin/delete_media_node.sh; }

# Start OpenVidu
systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; /usr/local/bin/delete_media_node.sh; }
'''

var installScriptMedia = reduce(
  items(stringInterpolationParamsMedia),
  { value: installScriptTemplateMedia },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var stop_media_nodesScriptMedia = reduce(
  items(stopMediaNodeParams),
  { value: stop_media_nodesScriptMediaTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var delete_mediaNode_ScriptMedia = reduce(
  items(stopMediaNodeParams),
  { value: delete_mediaNode_ScriptMediaTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var base64installMedia = base64(installScriptMedia)
var base64stopMediaNode = base64(stop_media_nodesScriptMedia)
var base64delete_mediaNode_ScriptMedia = base64(delete_mediaNode_ScriptMedia)

var userDataParamsMedia = {
  base64install: base64installMedia
  base64stop: base64stopMediaNode
  base64delete_mediaNode: base64delete_mediaNode_ScriptMedia
  resourceGroupName: resourceGroup().name
  vmScaleSetName: '${stackName}-mediaNodeScaleSet'
}

var userDataMediaNode = reduce(
  items(userDataParamsMedia),
  { value: userDataMediaNodeTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var base64userDataMediaNode = base64(userDataMediaNode)
param datetime string = utcNow('u')

resource openviduScaleSetMediaNode 'Microsoft.Compute/virtualMachineScaleSets@2024-07-01' = {
  name: '${stackName}-mediaNodeScaleSet'
  location: location
  tags: {
    InstanceDeleteTime: datetime
    storageAccount: isEmptyStorageAccountName ? storageAccount.name : existingStorageAccount.name
  }
  identity: { type: 'SystemAssigned' }
  sku: {
    name: mediaNodeInstanceType
    tier: 'Standard'
    capacity: initialNumberOfMediaNodes
  }
  properties: {
    overprovision: true
    upgradePolicy: {
      mode: 'Automatic'
    }
    singlePlacementGroup: true
    platformFaultDomainCount: 1
    virtualMachineProfile: {
      storageProfile: {
        osDisk: {
          createOption: 'FromImage'
          managedDisk: {
            storageAccountType: mediaNodeVMSettings.osDiskType
          }
          diskSizeGB: 50
        }
        imageReference: mediaNodeVMSettings.ubuntuOSVersion
      }
      osProfile: {
        computerNamePrefix: mediaNodeVMSettings.vmName
        adminUsername: adminUsername
        linuxConfiguration: mediaNodeVMSettings.linuxConfiguration
      }
      networkProfile: {
        networkInterfaceConfigurations: [
          {
            name: '${stackName}-mediaNodeNetInterface'
            properties: {
              primary: true
              ipConfigurations: [
                {
                  name: 'ipconfigMediaNode'
                  properties: {
                    subnet: {
                      id: vnet_OV.properties.subnets[0].id
                    }
                    applicationSecurityGroups: [
                      {
                        id: openviduMediaNodeASG.id
                      }
                    ]
                    publicIPAddressConfiguration: {
                      name: 'publicIPAddressMediaNode'
                      properties: {
                        publicIPAddressVersion: 'IPv4'
                      }
                    }
                  }
                }
              ]
              networkSecurityGroup: {
                id: openviduMediaNodeNSG.id
              }
            }
          }
        ]
      }
      userData: base64userDataMediaNode
    }
  }
}

resource openviduAutoScaleSettingsMediaNode 'Microsoft.Insights/autoscaleSettings@2022-10-01' = {
  name: '${stackName}-autoscaleSettings'
  location: resourceGroup().location
  properties: {
    profiles: [
      {
        name: 'openvidu-medianode-autoscale'
        capacity: {
          minimum: string(minNumberOfMediaNodes)
          maximum: string(maxNumberOfMediaNodes)
          default: string(initialNumberOfMediaNodes)
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'Percentage CPU'
              metricNamespace: 'Microsoft.Compute/virtualMachineScaleSets'
              metricResourceUri: openviduScaleSetMediaNode.id
              statistic: 'Average'
              operator: 'GreaterThan'
              threshold: scaleTargetCPU
              timeAggregation: 'Average'
              timeWindow: 'PT5M'
              timeGrain: 'PT1M'
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'Percentage CPU'
              metricNamespace: 'Microsoft.Compute/virtualMachineScaleSets'
              metricResourceUri: openviduScaleSetMediaNode.id
              statistic: 'Average'
              operator: 'LessThan'
              threshold: scaleTargetCPU
              timeAggregation: 'Average'
              timeWindow: 'PT5M'
              timeGrain: 'PT1M'
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
        ]
      }
    ]
    enabled: true
    targetResourceUri: openviduScaleSetMediaNode.id
  }
}

/*------------------------------------------- SCALE IN ------------------------------------------*/

resource roleAssignmentMasterNode1 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('roleAssignmentForMasterNode${openviduMasterNode1.name}')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: openviduMasterNode1.identity.principalId
  }
}

resource roleAssignmentMasterNode2 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('roleAssignmentForMasterNode${openviduMasterNode2.name}')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: openviduMasterNode2.identity.principalId
  }
}

resource roleAssignmentMasterNode3 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('roleAssignmentForMasterNode${openviduMasterNode3.name}')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: openviduMasterNode3.identity.principalId
  }
}

resource roleAssignmentMasterNode4 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('roleAssignmentForMasterNode${openviduMasterNode4.name}')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: openviduMasterNode4.identity.principalId
  }
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('roleAssignmentForScaleSet${openviduScaleSetMediaNode.name}')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: openviduScaleSetMediaNode.identity.principalId
  }
}

@description('Automation Account Name to create a runbook inside it for scale in')
param automationAccountName string = ''

var isEmptyAutomationAccountName = automationAccountName == ''

module webhookModule '../../shared/webhookdeployment.json' = {
  params: {
    automationAccountName: isEmptyAutomationAccountName
      ? uniqueString(resourceGroup().id, openviduMasterNode1.id)
      : automationAccountName
    runbookName: 'scaleInRunbook'
    webhookName: 'webhookForScaleIn'
    WebhookExpiryTime: '2035-03-30T00:00:00Z'
    _artifactsLocation: 'https://raw.githubusercontent.com/OpenVidu/openvidu/refs/heads/master/openvidu-deployment/pro/shared/scaleInRunbook.ps1'
  }
  name: 'WebhookDeployment'
}

resource actionGroupScaleIn 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'actiongrouptest'
  location: 'global'
  properties: {
    groupShortName: 'scaleinag'
    enabled: true
    automationRunbookReceivers: [
      {
        name: 'scalein'
        useCommonAlertSchema: false
        automationAccountId: webhookModule.outputs.automationAccountId
        runbookName: 'scaleInRunbook'
        webhookResourceId: webhookModule.outputs.webhookId
        isGlobalRunbook: false
        serviceUri: webhookModule.outputs.webhookUri
      }
    ]
  }
}

resource scaleInActivityLogRule 'Microsoft.Insights/activityLogAlerts@2020-10-01' = {
  name: 'ScaleInAlertRule'
  location: 'global'
  properties: {
    scopes: [
      openviduScaleSetMediaNode.id
    ]
    condition: {
      allOf: [
        {
          field: 'category'
          equals: 'Administrative'
        }
        {
          field: 'operationName'
          equals: 'Microsoft.Compute/virtualMachineScaleSets/write'
        }
        {
          field: 'level'
          containsAny: [
            'error'
          ]
        }
        {
          field: 'status'
          containsAny: [
            'failed'
          ]
        }
        {
          field: 'caller'
          equals: '42628537-ebd8-40bf-941a-dddd338e1fe9'
        }
      ]
    }
    actions: {
      actionGroups: [
        {
          actionGroupId: actionGroupScaleIn.id
        }
      ]
    }
    enabled: true
  }
}

/*------------------------------------------- NETWORK -------------------------------------------*/

var lbName = '${stackName}-loadBalancer'
var lbFrontEndName = 'LoadBalancerFrontEnd'
var lbBackendPoolNameMasterNode = 'LoadBalancerBackEndMasterNode'

var ipExists = publicIpAddressObject.newOrExistingOrNone == 'existing'

resource publicIP_OV_ifExisting'Microsoft.Network/publicIPAddresses@2023-11-01' existing = if (ipExists == true) {
  name: publicIpAddressObject.name
}

var ipNew = publicIpAddressObject.newOrExistingOrNone == 'new'

resource publicIP_OV_ifNew 'Microsoft.Network/publicIPAddresses@2023-11-01' = if (ipNew == true) {
  name: publicIpAddressObject.name
  location: location
  sku: {
    name: 'Standard'
    tier: 'Regional'
  }
  properties: {
    publicIPAddressVersion: 'IPv4'
    publicIPAllocationMethod: 'Static'
    dnsSettings: {
      domainNameLabel: isEmptyDomain ? toLower('${stackName}') : null
    }
  }
}

var publicIPId = ipNew ? publicIP_OV_ifNew.id : ipExists ? publicIP_OV_ifExisting.id : ''

resource LoadBalancer 'Microsoft.Network/loadBalancers@2024-05-01' = {
  name: lbName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    frontendIPConfigurations: [
      {
        name: lbFrontEndName
        properties: {
          publicIPAddress: isEmptyIp ? null : {
            id: ipNew ? publicIP_OV_ifNew.id : publicIP_OV_ifExisting.id
          }
        }
      }
    ]
    backendAddressPools: [
      {
        name: lbBackendPoolNameMasterNode
      }
    ]
    loadBalancingRules: [
      {
        name: 'HTTPSRuleforMasterNode'
        properties: {
          frontendIPConfiguration: {
            id: resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations', lbName, lbFrontEndName)
          }
          backendAddressPool: {
            id: resourceId('Microsoft.Network/loadBalancers/backendAddressPools', lbName, lbBackendPoolNameMasterNode)
          }
          frontendPort: 443
          backendPort: 443
          enableFloatingIP: false
          protocol: 'Tcp'
          enableTcpReset: true
          loadDistribution: 'Default'
          disableOutboundSnat: true
          probe: {
            id: resourceId('Microsoft.Network/loadBalancers/probes', lbName, 'probeForHTTPSRuleMasterNode')
          }
        }
      }
      {
        name: 'RTMPRuleforMasterNode'
        properties: {
          frontendIPConfiguration: {
            id: resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations', lbName, lbFrontEndName)
          }
          backendAddressPool: {
            id: resourceId('Microsoft.Network/loadBalancers/backendAddressPools', lbName, lbBackendPoolNameMasterNode)
          }
          frontendPort: 1935
          backendPort: 1945
          enableFloatingIP: false
          protocol: 'Tcp'
          enableTcpReset: true
          loadDistribution: 'Default'
          disableOutboundSnat: true
          probe: {
            id: resourceId('Microsoft.Network/loadBalancers/probes', lbName, 'probeForRTMPRuleMasterNode')
          }
        }
      }
      {
        name: 'HTTPRuleforMasterNode'
        properties: {
          frontendIPConfiguration: {
            id: resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations', lbName, lbFrontEndName)
          }
          backendAddressPool: {
            id: resourceId('Microsoft.Network/loadBalancers/backendAddressPools', lbName, lbBackendPoolNameMasterNode)
          }
          frontendPort: 80
          backendPort: 80
          enableFloatingIP: false
          protocol: 'Tcp'
          enableTcpReset: true
          loadDistribution: 'Default'
          disableOutboundSnat: true
          probe: {
            id: resourceId('Microsoft.Network/loadBalancers/probes', lbName, 'probeForHTTPSRuleMasterNode')
          }
        }
      }
    ]
    probes: [
      {
        name: 'probeForHTTPSRuleMasterNode'
        properties: {
          protocol: 'Http'
          requestPath: '/health/caddy'
          port: 7880
          probeThreshold: 3
          intervalInSeconds: 10
          numberOfProbes: 5
        }
      }
      {
        name: 'probeForRTMPRuleMasterNode'
        properties: {
          protocol: 'Tcp'
          port: 1945
          intervalInSeconds: 5
          numberOfProbes: 2
        }
      }
    ]
    outboundRules: []
  }
}

resource natGateway 'Microsoft.Network/natGateways@2021-05-01' = {
  name: '${stackName}-natGateway'
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    idleTimeoutInMinutes: 4
    publicIpAddresses: [
      {
        id: natGatewayPublicIPAddress.id
      }
    ]
  }
}

resource natGatewayPublicIPAddress 'Microsoft.Network/publicIPAddresses@2021-05-01' = {
  name: '${stackName}-publicIPnatGateway'
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAddressVersion: 'IPv4'
    publicIPAllocationMethod: 'Static'
    idleTimeoutInMinutes: 4
  }
}

var networkSettings = {
  vNetAddressPrefix: '10.0.0.0/16'
  subnetAddressPrefixMaster1: '10.0.1.0/24'
  subnetAddressPrefixMaster2: '10.0.2.0/24'
  subnetAddressPrefixMedia: '10.0.0.0/24'
  vNetName: '${stackName}-virtualNetwork'
}

resource vnet_OV 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: networkSettings.vNetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        networkSettings.vNetAddressPrefix
      ]
    }
    subnets: [
      {
        name: 'subnetForMediaNodes'
        properties: {
          addressPrefix: networkSettings.subnetAddressPrefixMedia
          privateEndpointNetworkPolicies: 'Disabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
          networkSecurityGroup: {
            id: openviduMediaNodeNSG.id
          }
        }
      }
    ]
  }
}

resource subnetMasterNode1 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' = {
  parent: vnet_OV
  name: 'firstSubnetForMasterNodes'
  properties: {
    addressPrefix: networkSettings.subnetAddressPrefixMaster1
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    natGateway: {
      id: natGateway.id
    }
  }
}

resource subnetMasterNode2 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' = {
  parent: vnet_OV
  name: 'secondSubnetForMasterNodes'
  properties: {
    addressPrefix: networkSettings.subnetAddressPrefixMaster2
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
    natGateway: {
      id: natGateway.id
    }
  }
  dependsOn: [
    subnetMasterNode1
  ]
}

resource netInterfaceMasterNode1 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: '${stackName}-masterNodeNetInterface1'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'primaryIPConfig'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetMasterNode1.id
          }
          applicationSecurityGroups: [
            {
              id: openviduMasterNodeASG.id
            }
          ]
          loadBalancerBackendAddressPools: [
            {
              id: LoadBalancer.properties.backendAddressPools[0].id
            }
          ]
        }
      }
    ]
    networkSecurityGroup: {
      id: openviduMasterNodeNSG.id
    }
  }
}

resource netInterfaceMasterNode2 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: '${stackName}-masterNodeNetInterface2'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'primaryIPConfig'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetMasterNode2.id
          }
          applicationSecurityGroups: [
            {
              id: openviduMasterNodeASG.id
            }
          ]
          loadBalancerBackendAddressPools: [
            {
              id: LoadBalancer.properties.backendAddressPools[0].id
            }
          ]
        }
      }
    ]
    networkSecurityGroup: {
      id: openviduMasterNodeNSG.id
    }
  }
}

resource netInterfaceMasterNode3 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: '${stackName}-masterNodeNetInterface3'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'primaryIPConfig'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetMasterNode1.id
          }
          applicationSecurityGroups: [
            {
              id: openviduMasterNodeASG.id
            }
          ]
          loadBalancerBackendAddressPools: [
            {
              id: LoadBalancer.properties.backendAddressPools[0].id
            }
          ]
        }
      }
    ]
    networkSecurityGroup: {
      id: openviduMasterNodeNSG.id
    }
  }
}

resource netInterfaceMasterNode4 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: '${stackName}-masterNodeNetInterface4'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'primaryIPConfig'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetMasterNode2.id
          }
          applicationSecurityGroups: [
            {
              id: openviduMasterNodeASG.id
            }
          ]
          loadBalancerBackendAddressPools: [
            {
              id: LoadBalancer.properties.backendAddressPools[0].id
            }
          ]
        }
      }
    ]
    networkSecurityGroup: {
      id: openviduMasterNodeNSG.id
    }
  }
}

resource openviduMasterNodeNSG 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: '${stackName}-masterNodeNSG'
  location: location
  properties: {
    securityRules: [
      {
        name: 'SSH'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
          access: 'Allow'
          priority: 100
          direction: 'Inbound'
        }
      }
      {
        name: 'ProbeAPI'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: 'AzureLoadBalancer'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '7880'
          access: 'Allow'
          priority: 500
          direction: 'Inbound'
        }
      }
      {
        name: 'HTTP'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
          access: 'Allow'
          priority: 510
          direction: 'Inbound'
        }
      }
    ]
  }
}

resource openviduMasterNodeASG 'Microsoft.Network/applicationSecurityGroups@2024-03-01' = {
  name: '${stackName}-masterNodeASG'
  location: location
}

resource loadBalancerToMasterIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'loadBalancer_to_masterNode_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceAddressPrefix: '*'
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '443'
    access: 'Allow'
    priority: 110
    direction: 'Inbound'
  }
}

resource masterToMasterRedisIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_REDIS_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '7000'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '7001'
    access: 'Allow'
    priority: 120
    direction: 'Inbound'
  }
}

resource mediaToMasterRedisIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'mediaNode_to_masterNode_REDIS_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    sourcePortRange: '7000'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '7001'
    access: 'Allow'
    priority: 130
    direction: 'Inbound'
  }
}

resource masterToMasterMinioIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_MINIO_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '9100'
    access: 'Allow'
    priority: 140
    direction: 'Inbound'
  }
}

resource masterToMasterMinioConsoleIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_MINIO_CONSOLE_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '9101'
    access: 'Allow'
    priority: 150
    direction: 'Inbound'
  }
}

resource mediaToMasterMinioIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'mediaNode_to_masterNode_MINIO_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '9100'
    access: 'Allow'
    priority: 160
    direction: 'Inbound'
  }
}

resource masterToMasterMongoIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_MONGO_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '20000'
    access: 'Allow'
    priority: 170
    direction: 'Inbound'
  }
}

resource mediaToMasterMongoIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'mediaNode_to_masterNode_MONGO_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '20000'
    access: 'Allow'
    priority: 180
    direction: 'Inbound'
  }
}

resource masterToMasterMimirGrpcIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_MIMIRGRPC_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '9095'
    access: 'Allow'
    priority: 190
    direction: 'Inbound'
  }
}

resource masterToMasterMimirGossipIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_MIMIRGOSSIP_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '7946'
    access: 'Allow'
    priority: 200
    direction: 'Inbound'
  }
}

resource mediaToMasterMimirIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'mediaNode_to_masterNode_MIMIR_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '9009'
    access: 'Allow'
    priority: 210
    direction: 'Inbound'
  }
}

resource masterToMasterLokiGrpcIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_LOKIGRPC_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '9096'
    access: 'Allow'
    priority: 220
    direction: 'Inbound'
  }
}

resource masterToMasterLokiGossipIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_LOKIGOSSIP_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '7947'
    access: 'Allow'
    priority: 230
    direction: 'Inbound'
  }
}

resource masterToMasterDashboardIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_DASHBOARD_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '5000'
    access: 'Allow'
    priority: 240
    direction: 'Inbound'
  }
}

resource masterToMasterGrafanaIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_GRAFANA_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '3000'
    access: 'Allow'
    priority: 250
    direction: 'Inbound'
  }
}

resource mediaToMasterLokiIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'mediaNode_to_masterNode_LOKI_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '3100'
    access: 'Allow'
    priority: 260
    direction: 'Inbound'
  }
}

resource masterToMasterV2CompatibilityIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_V2COMPATIBILITY_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '4443'
    access: 'Allow'
    priority: 270
    direction: 'Inbound'
  }
}

resource mediaToMasterV2CompatibilityWebhookIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'mediaNode_to_masterNode_V2COMPATIBILITY_WEBHOOK_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '4443'
    access: 'Allow'
    priority: 280
    direction: 'Inbound'
  }
}

resource masterToMasterMeet 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'masterNode_to_masterNode_MEET_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '6080'
    access: 'Allow'
    priority: 290
    direction: 'Inbound'
  }
}

resource mediaToMasterMeetWebhookIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMasterNodeNSG
  name: 'mediaNode_to_masterNode_MEET_WEBHOOK_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '6080'
    access: 'Allow'
    priority: 300
    direction: 'Inbound'
  }
}

resource openviduMediaNodeNSG 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: '${stackName}-mediaNodeNSG'
  location: location
  properties: {
    securityRules: [
      {
        name: 'SSH'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
          access: 'Allow'
          priority: 100
          direction: 'Inbound'
        }
      }
      {
        name: 'TURN'
        properties: {
          protocol: 'Udp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
          access: 'Allow'
          priority: 110
          direction: 'Inbound'
        }
      }
      {
        name: 'WebRTC_over_TCP'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '7881'
          access: 'Allow'
          priority: 120
          direction: 'Inbound'
        }
      }
      {
        name: 'WebRTC_using_WHIP'
        properties: {
          protocol: 'Udp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '7885'
          access: 'Allow'
          priority: 130
          direction: 'Inbound'
        }
      }
      {
        name: 'WebRTC_traffic_UDP'
        properties: {
          protocol: 'Udp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRanges: [
            '50000'
            '60000'
          ]
          access: 'Allow'
          priority: 140
          direction: 'Inbound'
        }
      }
      {
        name: 'WebRTC_traffic_TCP'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRanges: [
            '50000'
            '60000'
          ]
          access: 'Allow'
          priority: 150
          direction: 'Inbound'
        }
      }
    ]
  }
}

resource openviduMediaNodeASG 'Microsoft.Network/applicationSecurityGroups@2024-03-01' = {
  name: '${stackName}-mediaNodeASG'
  location: location
}

resource loadBalancerToMediaRtmpIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMediaNodeNSG
  name: 'loadBalancer_to_mediaNode_RTMP_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceAddressPrefix: 'AzureLoadBalancer'
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    destinationPortRange: '1945'
    access: 'Allow'
    priority: 160
    direction: 'Inbound'
  }
}

resource loadBalancerToMediaHealthcheckIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMediaNodeNSG
  name: 'loadBalancer_to_mediaNode_HEALTHCHECK_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceAddressPrefix: 'AzureLoadBalancer'
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    destinationPortRange: '9092'
    access: 'Allow'
    priority: 170
    direction: 'Inbound'
  }
}

resource loadBalancerToMediaTurnTlsIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = if (turnTLSIsEnabled == true) {
  parent: openviduMediaNodeNSG
  name: 'loadbalancer_to_mediaNode_TURN_TLS_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceAddressPrefix: 'AzureLoadBalancer'
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    destinationPortRange: '5349'
    access: 'Allow'
    priority: 180
    direction: 'Inbound'
  }
}

resource loadBalancerToMediaTurnTlsHealthCheckIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = if (turnTLSIsEnabled == true) {
  parent: openviduMediaNodeNSG
  name: 'masterNode_to_mediaNode_TURN_TLSHEALTHCHECK_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceAddressPrefix: 'AzureLoadBalancer'
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    destinationPortRange: '7880'
    access: 'Allow'
    priority: 190
    direction: 'Inbound'
  }
}

resource masterToMediaServerIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMediaNodeNSG
  name: 'masterNode_to_mediaNode_SERVER_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    destinationPortRange: '7880'
    access: 'Allow'
    priority: 200
    direction: 'Inbound'
  }
}

resource masterToMediaClientIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMediaNodeNSG
  name: 'masterNode_to_mediaNode_CLIENT_INGRESS'
  properties: {
    protocol: 'Tcp'
    sourceApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMediaNodeASG.id
      }
    ]
    destinationPortRange: '8080'
    access: 'Allow'
    priority: 210
    direction: 'Inbound'
  }
}

/*------------------------------------------- STORAGE ACCOUNT ----------------------------------------*/

@description('Name of an existing storage account. It is essential that this parameter is filled just when you want to save recordings and still using the same container after an update. If not specified, a new storage account will be generated.')
param storageAccountName string = ''

var isEmptyStorageAccountName = storageAccountName == ''

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = if (isEmptyStorageAccountName == true) {
  name: uniqueString(resourceGroup().id)
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Cool'
    supportsHttpsTrafficOnly: true
  }
}

resource existingStorageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = if (isEmptyStorageAccountName == false) {
  name: storageAccountName
}

resource blobContainerScaleIn 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (isEmptyStorageAccountName == true) {
  name: '${storageAccount.name}/default/automation-locks'
  properties: {
    publicAccess: 'None'
  }
}

@description('Name of the bucket where OpenVidu will store the recordings if a new Storage account is being creating. If not specified, a default bucket will be created. If you want to use an existing storage account, fill this parameter with the name of the container where the recordings are stored.')
param appDataContainerName string = ''

var isEmptyAppDataContainerName = appDataContainerName == ''

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (isEmptyStorageAccountName == true) {
  name: isEmptyAppDataContainerName
    ? '${storageAccount.name}/default/openvidu-appdata'
    : '${storageAccount.name}/default/${appDataContainerName}'
  properties: {
    publicAccess: 'None'
  }
}

@description('Name of the bucket where OpenVidu will store the recordings if a new Storage account is being creating. If not specified, a default bucket will be created. If you want to use an existing storage account, fill this parameter with the name of the container where the recordings are stored.')
param clusterDataContainerName string = ''

var isEmptyClusterContainerName = clusterDataContainerName == ''

resource clusterDatablobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (isEmptyStorageAccountName == true) {
  name: isEmptyClusterContainerName
    ? '${storageAccount.name}/default/openvidu-clusterdata'
    : '${storageAccount.name}/default/${clusterDataContainerName}'
  properties: {
    publicAccess: 'None'
  }
}

/*------------------------------------------- OUTPUTS -------------------------------------------*/
