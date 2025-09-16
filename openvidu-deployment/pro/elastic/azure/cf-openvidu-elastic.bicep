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

@description('Previously created Public IP address for the OpenVidu Deployment. Blank will generate a public IP')
param publicIpAddressObject object

@description('Domain name for the OpenVidu Deployment. Blank will generate default domain')
param domainName string = ''

@description('If certificate type is \'owncert\', this parameter will be used to specify the public certificate')
param ownPublicCertificate string = ''

@description('If certificate type is \'owncert\', this parameter will be used to specify the private certificate')
param ownPrivateCertificate string = ''

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

@description('Initial password for the \'admin\' user in OpenVidu Meet. If not provided, a random password will be generated.')
@secure()
param initialMeetAdminPassword string = ''

@description('Initial API key for OpenVidu Meet. If not provided, no API key will be set and the user can set it later from Meet Console.')
@secure()
param initialMeetApiKey string = ''

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

@description('SSH Key or password for the Virtual Machine')
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
  vmName: '${stackName}-VM-MasterNode'
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

var mediaNodeVMSettings = {
  vmName: '${stackName}-VM-MediaNode'
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

var networkSettings = {
  vNetAddressPrefix: '10.0.0.0/16'
  subnetAddressPrefixMaster1: '10.0.1.0/24'
  subnetAddressPrefixMedia: '10.0.0.0/24'
  vNetName: '${stackName}-virtualNetwork'
}

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
        objectId: openviduMasterNode.identity.principalId
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

var stringInterpolationParamsMaster = {
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
  initialMeetAdminPassword: initialMeetAdminPassword
  initialMeetApiKey: initialMeetApiKey
  keyVaultName: keyVaultName
  additionalInstallFlags: additionalInstallFlags
}

var installScriptTemplateMaster = '''
#!/bin/bash -x
OPENVIDU_VERSION=main
DOMAIN=

# Assume azure cli is installed

apt-get update && apt-get install -y \
  curl \
  unzip \
  jq \
  wget

# Configure Domain
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

# Wait for the keyvault availability
MAX_WAIT=100
WAIT_INTERVAL=1
ELAPSED_TIME=0
while true; do
  # Check keyvault availability
  set +e
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

  # Wait for the next iteration
  sleep $WAIT_INTERVAL
done
set -e

# Get own private IP
PRIVATE_IP=$(curl -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/privateIpAddress?api-version=2017-08-01&format=text")


# Store usernames and generate random passwords
DOMAIN="$(/usr/local/bin/store_secret.sh save DOMAIN-NAME "$DOMAIN")"

# Meet initial admin user and password
MEET_INITIAL_ADMIN_USER="$(/usr/local/bin/store_secret.sh save MEET-INITIAL-ADMIN-USER "admin")"
if [[ "${initialMeetAdminPassword}" != '' ]]; then
  MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh save MEET-INITIAL-ADMIN-PASSWORD "${initialMeetAdminPassword}")"
else
  MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate MEET-INITIAL-ADMIN-PASSWORD)"
fi
if [[ "${initialMeetApiKey}" != '' ]]; then
  MEET_INITIAL_API_KEY="$(/usr/local/bin/store_secret.sh save MEET-INITIAL-API-KEY "${initialMeetApiKey}")"
else
  MEET_INITIAL_API_KEY="$(/usr/local/bin/store_secret.sh save MEET-INITIAL-API-KEY "")"
fi

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
LIVEKIT_API_KEY="$(/usr/local/bin/store_secret.sh generate LIVEKIT-API-KEY "API" 12)"
LIVEKIT_API_SECRET="$(/usr/local/bin/store_secret.sh generate LIVEKIT-API-SECRET)"
OPENVIDU_VERSION="$(/usr/local/bin/store_secret.sh save OPENVIDU-VERSION "${OPENVIDU_VERSION}")"
ENABLED_MODULES="$(/usr/local/bin/store_secret.sh save ENABLED-MODULES "observability,openviduMeet,v2compatibility")"
ALL_SECRETS_GENERATED="$(/usr/local/bin/store_secret.sh save ALL-SECRETS-GENERATED "true")"

# Base command
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/elastic/$OPENVIDU_VERSION/install_ov_master_node.sh)"

# Common arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=azure"
  "--deployment-type=elastic"
  "--node-role='master-node'"
  "--openvidu-pro-license=$OPENVIDU_PRO_LICENSE"
  "--private-ip=$PRIVATE_IP"
  "--domain-name=$DOMAIN"
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

# Turn with TLS
if [[ "${turnDomainName}" != '' ]]; then
  LIVEKIT_TURN_DOMAIN_NAME=$(/usr/local/bin/store_secret.sh save LIVEKIT-TURN-DOMAIN-NAME "${turnDomainName}")
  COMMON_ARGS+=(
    "--turn-domain-name=$LIVEKIT_TURN_DOMAIN_NAME"
  )
elif [[ "${TURN_DOMAIN_NAME_SSLIP_IO}" != '' ]]; then
  LIVEKIT_TURN_DOMAIN_NAME=$(/usr/local/bin/store_secret.sh save LIVEKIT-TURN-DOMAIN-NAME "${TURN_DOMAIN_NAME_SSLIP_IO}")
  COMMON_ARGS+=(
    "--turn-domain-name=$LIVEKIT_TURN_DOMAIN_NAME"
  )
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

# Construct the final command with all arguments
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
OPENVIDU_URL="https://${DOMAIN}/"
LIVEKIT_URL="wss://${DOMAIN}/"
DASHBOARD_URL="https://${DOMAIN}/dashboard/"
GRAFANA_URL="https://${DOMAIN}/grafana/"
MINIO_URL="https://${DOMAIN}/minio-console/"

# Update shared secret
az keyvault secret set --vault-name ${keyVaultName} --name DOMAIN-NAME --value $DOMAIN
az keyvault secret set --vault-name ${keyVaultName} --name OPENVIDU-URL --value $OPENVIDU_URL
az keyvault secret set --vault-name ${keyVaultName} --name LIVEKIT-URL --value $LIVEKIT_URL
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
if [[ "${initialMeetApiKey}" != '' ]]; then
  export MEET_INITIAL_API_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-INITIAL-API-KEY --query value -o tsv)
fi
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
if [[ "${initialMeetApiKey}" != '' ]]; then
  sed -i "s/MEET_INITIAL_API_KEY=.*/MEET_INITIAL_API_KEY=$MEET_INITIAL_API_KEY/" "${CLUSTER_CONFIG_DIR}/master_node/meet.env"
fi
sed -i "s/ENABLED_MODULES=.*/ENABLED_MODULES=$ENABLED_MODULES/" "${CLUSTER_CONFIG_DIR}/openvidu.env"

# Update URLs in secret
OPENVIDU_URL="https://${DOMAIN}/"
LIVEKIT_URL="wss://${DOMAIN}/"
DASHBOARD_URL="https://${DOMAIN}/dashboard/"
GRAFANA_URL="https://${DOMAIN}/grafana/"
MINIO_URL="https://${DOMAIN}/minio-console/"

# Update shared secret
az keyvault secret set --vault-name ${keyVaultName} --name DOMAIN-NAME --value $DOMAIN
az keyvault secret set --vault-name ${keyVaultName} --name OPENVIDU-URL --value $OPENVIDU_URL
az keyvault secret set --vault-name ${keyVaultName} --name LIVEKIT-URL --value $LIVEKIT_URL
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
if [[ "${initialMeetApiKey}" != '' ]]; then
  MEET_INITIAL_API_KEY="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_API_KEY "${CLUSTER_CONFIG_DIR}/master_node/meet.env")"
fi
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
if [[ "${initialMeetApiKey}" != '' ]]; then
  az keyvault secret set --vault-name ${keyVaultName} --name MEET-INITIAL-API-KEY --value $MEET_INITIAL_API_KEY
fi
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

var installScriptMaster = reduce(
  items(stringInterpolationParamsMaster),
  { value: installScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var after_installScriptMaster = reduce(
  items(stringInterpolationParamsMaster),
  { value: after_installScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var get_public_ip_script = reduce(
  items(stringInterpolationParamsMaster),
  { value: get_public_ip},
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var update_config_from_secretScriptMaster = reduce(
  items(stringInterpolationParamsMaster),
  { value: update_config_from_secretScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var update_secret_from_configScriptMaster = reduce(
  items(stringInterpolationParamsMaster),
  { value: update_secret_from_configScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var store_secretScriptMaster = reduce(
  items(stringInterpolationParamsMaster),
  { value: store_secretScriptTemplateMaster },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var blobStorageParams = {
  storageAccountName: isEmptyStorageAccountName ? storageAccount.name : exisitngStorageAccount.name
  storageAccountKey: listKeys(storageAccount.id, '2021-04-01').keys[0].value
  storageAccountContainerName: isEmptyContainerName ? 'openvidu-appdata' : '${containerName}'
}

var config_blobStorageScript = reduce(
  items(blobStorageParams),
  { value: config_blobStorageTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var base64installMaster = base64(installScriptMaster)
var base64after_installMaster = base64(after_installScriptMaster)
var base64update_config_from_secretMaster = base64(update_config_from_secretScriptMaster)
var base64update_secret_from_configMaster = base64(update_secret_from_configScriptMaster)
var base64get_value_from_configMaster = base64(get_value_from_configScriptMaster)
var base64store_secretMaster = base64(store_secretScriptMaster)
var base64get_public_ipMaster = base64(get_public_ip_script)
var base64check_app_readyMaster = base64(check_app_readyScriptMaster)
var base64restartMaster = base64(restartScriptMaster)
var base64config_blobStorage = base64(config_blobStorageScript)

var userDataParamsMasterNode = {
  base64install: base64installMaster
  base64after_install: base64after_installMaster
  base64update_config_from_secret: base64update_config_from_secretMaster
  base64update_secret_from_config: base64update_secret_from_configMaster
  base64get_value_from_config: base64get_value_from_configMaster
  base64store_secret: base64store_secretMaster
  base64get_public_ip: base64get_public_ipMaster
  base64check_app_ready: base64check_app_readyMaster
  base64restart: base64restartMaster
  base64config_blobStorage: base64config_blobStorage
  keyVaultName: keyVaultName
  storageAccountName: isEmptyStorageAccountName ? storageAccount.name : exisitngStorageAccount.name
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

# get_public_ip.sh
echo ${base64get_public_ip} | base64 -d > /usr/local/bin/get_public_ip.sh
chmod +x /usr/local/bin/get_public_ip.sh

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

set +e
az storage blob upload --account-name ${storageAccountName} --container-name automation-locks --name lock.txt --file /dev/null --auth-mode key
set -e

az keyvault secret set --vault-name ${keyVaultName} --name FINISH-MASTER-NODE --value "true"

# Wait for the app
sleep 150
/usr/local/bin/check_app_ready.sh
'''

var userDataMasterNode = reduce(
  items(userDataParamsMasterNode),
  { value: userDataTemplateMasterNode },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

resource openviduMasterNode 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: masterNodeVMSettings.vmName
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
        diskSizeGB: 100
      }
      imageReference: masterNodeVMSettings.ubuntuOSVersion
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: netInterfaceMasterNode.id
        }
      ]
    }
    osProfile: {
      computerName: masterNodeVMSettings.vmName
      adminUsername: adminUsername
      linuxConfiguration: masterNodeVMSettings.linuxConfiguration
    }
    userData: base64(userDataMasterNode)
  }
}

/*------------------------------------------- MEDIA NODES -------------------------------------------*/

var stringInterpolationParamsMedia = {
  privateIPMasterNode: netInterfaceMasterNode.properties.ipConfigurations[0].properties.privateIPAddress
  keyVaultName: keyVaultName
}

var installScriptTemplateMedia = '''
#!/bin/bash -x
set -e
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
MAX_WAIT=200
ELAPSED_TIME=0
set +e
while true; do
  # get secret value
  FINISH_MASTER_NODE=$(az keyvault secret show --vault-name ${keyVaultName} --name FINISH-MASTER-NODE --query value -o tsv)

  # Check if the secret has been generated
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
# Get current shared secret
DOMAIN=$(az keyvault secret show --vault-name ${keyVaultName} --name DOMAIN-NAME --query value -o tsv)
OPENVIDU_PRO_LICENSE=$(az keyvault secret show --vault-name ${keyVaultName} --name OPENVIDU-PRO-LICENSE --query value -o tsv)
REDIS_PASSWORD=$(az keyvault secret show --vault-name ${keyVaultName} --name REDIS-PASSWORD --query value -o tsv)
ENABLED_MODULES=$(az keyvault secret show --vault-name ${keyVaultName} --name ENABLED-MODULES --query value -o tsv)
OPENVIDU_VERSION="$(az keyvault secret show --vault-name ${keyVaultName} --name OPENVIDU-VERSION --query value -o tsv)"

# Get Master Node private IP
MASTER_NODE_IP=${privateIPMasterNode}

# Base command
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/elastic/$OPENVIDU_VERSION/install_ov_media_node.sh)"

# Common arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=azure"
  "--deployment-type=elastic"
  "--node-role='media-node'"
  "--master-node-private-ip=$MASTER_NODE_IP"
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
  storageAccountName: isEmptyStorageAccountName ? storageAccount.name : exisitngStorageAccount.name
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

  # Wait for running containers to not be openvidu, ingress, egress or an openvidu agent
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

# delete_media_node.sh
echo ${base64delete} | base64 -d > /usr/local/bin/delete_media_node.sh
chmod +x /usr/local/bin/delete_media_node.sh

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

var base64installMedia = base64(installScriptMedia)

var stop_media_nodesScriptMedia = reduce(
  items(stopMediaNodeParams),
  { value: stop_media_nodesScriptMediaTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var base64stopMediaNode = base64(stop_media_nodesScriptMedia)

var delete_mediaNode_ScriptMedia = reduce(
  items(stopMediaNodeParams),
  { value: delete_mediaNode_ScriptMediaTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var base64delete_mediaNode_ScriptMedia = base64(delete_mediaNode_ScriptMedia)

var userDataParamsMedia = {
  base64install: base64installMedia
  base64stop: base64stopMediaNode
  base64delete: base64delete_mediaNode_ScriptMedia
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
    storageAccount: isEmptyStorageAccountName ? storageAccount.name : exisitngStorageAccount.name
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

resource openviduAutoScaleSettings 'Microsoft.Insights/autoscaleSettings@2022-10-01' = {
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

resource roleAssignmentMasterNode 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('roleAssignmentForMasterNode${openviduMasterNode.name}')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: openviduMasterNode.identity.principalId
    principalType: 'ServicePrincipal'
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
    principalType: 'ServicePrincipal'
  }
}

@description('Automation Account Name to create a runbook inside it for scale in')
param automationAccountName string = ''

var isEmptyAutomationAccountName = automationAccountName == ''

module webhookModule '../../shared/webhookdeployment.json' = {
  params: {
    automationAccountName: isEmptyAutomationAccountName
      ? uniqueString(resourceGroup().id, openviduMasterNode.id)
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

var ipExists = publicIpAddressObject.newOrExistingOrNone == 'existing'

resource publicIP_OV_ifExisting 'Microsoft.Network/publicIPAddresses@2023-11-01' existing = if (ipExists == true) {
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

resource subnetMasterNode 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' = {
  parent: vnet_OV
  name: 'firstSubnetForMasterNodes'
  properties: {
    addressPrefix: networkSettings.subnetAddressPrefixMaster1
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
  }
}

resource netInterfaceMasterNode 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: '${stackName}-masterNoderNetInterface'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'primaryIPConfig'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetMasterNode.id
          }
          applicationSecurityGroups: [
            {
              id: openviduMasterNodeASG.id
            }
          ]
          publicIPAddress: isEmptyIp ? null : {
            id: ipNew ? publicIP_OV_ifNew.id : publicIP_OV_ifExisting.id
          }
        }
      }
    ]
    networkSecurityGroup: {
      id: openviduMasterNodeNSG.id
    }
  }
}

resource openviduMasterNodeNSG 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: '${stackName}-masterNoderNSG'
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
        name: 'HTTP'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
          access: 'Allow'
          priority: 110
          direction: 'Inbound'
        }
      }
      {
        name: 'HTTPS'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
          access: 'Allow'
          priority: 120
          direction: 'Inbound'
        }
      }
      {
        name: 'RTMP'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '1935'
          access: 'Allow'
          priority: 130
          direction: 'Inbound'
        }
      }
      {
        name: 'MinIO'
        properties: {
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '9000'
          access: 'Allow'
          priority: 140
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
    sourcePortRange: '*'
    destinationApplicationSecurityGroups: [
      {
        id: openviduMasterNodeASG.id
      }
    ]
    destinationPortRange: '7000'
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
    priority: 170
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
    priority: 180
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
    priority: 190
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
    priority: 200
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
    priority: 210
    direction: 'Inbound'
  }
}

resource openviduMediaNodeNSG 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: '${stackName}-mediaNoderNSG'
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

resource masterToMediaRtmpIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMediaNodeNSG
  name: 'masterNode_to_mediaNode_RTMP_INGRESS'
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
    destinationPortRange: '1935'
    access: 'Allow'
    priority: 160
    direction: 'Inbound'
  }
}

resource masterToMediaTurnTlsIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMediaNodeNSG
  name: 'masterNode_to_mediaNode_TURN_TLS_INGRESS'
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
    destinationPortRange: '5349'
    access: 'Allow'
    priority: 170
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
    priority: 180
    direction: 'Inbound'
  }
}

resource masterToMediaHttpWhipIngress 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = {
  parent: openviduMediaNodeNSG
  name: 'masterNode_to_mediaNode_HTTP_WHIP_INGRESS'
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
    priority: 190
    direction: 'Inbound'
  }
}

/*------------------------------------------- STORAGE ACCOUNT ----------------------------------------*/

@description('Name of the existing storage account. It is essential that this parameter is filled just when you want to save recordings and still using the same container after an update. If not specified, a new storage account will be generated.')
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

resource exisitngStorageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = if (isEmptyStorageAccountName == false) {
  name: storageAccountName
}

resource blobContainerScaleIn 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (isEmptyStorageAccountName == true) {
  name: '${storageAccount.name}/default/automation-locks'
  properties: {
    publicAccess: 'None'
  }
}

@description('Name of the bucket where OpenVidu will store the recordings if a new Storage account is being creating. If not specified, a default bucket will be created. If you want to use an existing storage account, fill this parameter with the name of the container where the recordings are stored.')
param containerName string = ''

var isEmptyContainerName = containerName == ''

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (isEmptyStorageAccountName == true) {
  name: isEmptyContainerName
    ? '${storageAccount.name}/default/openvidu-appdata'
    : '${storageAccount.name}/default/${containerName}'
  properties: {
    publicAccess: 'None'
  }
}
