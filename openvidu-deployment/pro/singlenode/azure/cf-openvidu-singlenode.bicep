@description('Stack name')
param stackName string

@description('''
[selfsigned] Not recommended for production use. If you don't have a FQDN, (DomainName parameter) you can use this option to generate a self-signed certificate.
[owncert] Valid for productions environments. If you have a FQDN, (DomainName parameter)
and an Elastic IP, you can use this option to use your own certificate.
[letsencrypt] Valid for production environments. If you have a FQDN, (DomainName parameter)
and an Elastic IP, you can use this option to generate a Let's Encrypt certificate.
''')
@allowed([
  'selfsigned'
  'owncert'
  'letsencrypt'
])
param certificateType string = 'selfsigned'

@description('Previously created Public IP address for the OpenVidu Deployment. Blank will generate a public IP')
param publicIpAddressObject object

@description('Domain name for the OpenVidu Deployment. Blank will generate default domain')
param domainName string = ''

@description('If certificate type is \'owncert\', this parameter will be used to specify the public certificate')
param ownPublicCertificate string = ''

@description('If certificate type is \'owncert\', this parameter will be used to specify the private certificate')
param ownPrivateCertificate string = ''

@description('If certificate type is \'letsencrypt\', this email will be used for Let\'s Encrypt notifications')
param letsEncryptEmail string = ''

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

// Azure instance config
@description('Specifies the azure vm size for your OpenVidu instance')
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
param instanceType string = 'Standard_B2s' // Azure instance types.

@description('Username for the Virtual Machine.')
param adminUsername string

@description('SSH Key or password for the Virtual Machine.')
@secure()
param adminSshKey object

param additionalInstallFlags string = ''

/*------------------------------------------- VARIABLES AND VALIDATIONS -------------------------------------------*/

//Condition for ipValid if is filled
var isEmptyIp = publicIpAddressObject.newOrExistingOrNone == 'none'

//Condition for the domain name
var isEmptyDomain = domainName == ''

//Variables for deployment
var networkSettings = {
  privateIPaddressNetInterface: '10.0.0.5'
  vNetAddressPrefix: '10.0.0.0/16'
  subnetAddressPrefix: '10.0.0.0/24'
  netInterfaceName: '${stackName}-netInteface'
  vNetName: '${stackName}-vnet'
  subnetName: 'default'
}

var openviduVMSettings = {
  vmName: '${stackName}-VM-CE'
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

var fqdn = isEmptyIp ? publicIP_OV.properties.dnsSettings.fqdn : domainName
//KeyVault for secrets
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
        //Rules for the master node when using key vault for secrets
        objectId: openviduServer.identity.principalId
        tenantId: tenantId
        permissions: {
          secrets: ['get', 'set', 'list']
        }
      }
      {
        //Rules for the user to check key vault for secrets
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

/*------------------------------------------- OPENVIDU NODE -------------------------------------------*/

//Parms for not string interpolation support for multiline
var stringInterpolationParams = {
  domainName: domainName
  fqdn: fqdn
  turnDomainName: turnDomainName
  certificateType: certificateType
  letsEncryptEmail: letsEncryptEmail
  ownPublicCertificate: ownPublicCertificate
  ownPrivateCertificate: ownPrivateCertificate
  turnOwnPublicCertificate: turnOwnPublicCertificate
  turnOwnPrivateCertificate: turnOwnPrivateCertificate
  keyVaultName: keyVaultName
  openviduLicense: openviduLicense
  rtcEngine: rtcEngine
  additionalInstallFlags: additionalInstallFlags
}

var installScriptTemplate = '''
#!/bin/bash -x
OPENVIDU_VERSION=main
DOMAIN=

apt-get update && apt-get install -y \
  curl \
  unzip \
  jq \
  wget

# Configure Domain
if [[ "${domainName}" == '' ]]; then
  [ ! -d "/usr/share/openvidu" ] && mkdir -p /usr/share/openvidu
  DOMAIN=${fqdn}
  echo ${fqdn} > /usr/share/openvidu/old-host-name
else
  DOMAIN=${domainName}
fi

DOMAIN="$(/usr/local/bin/store_secret.sh save DOMAIN-NAME "$DOMAIN")"
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
MEET_ADMIN_USER="$(/usr/local/bin/store_secret.sh save MEET-ADMIN-USER "meetadmin")"
MEET_ADMIN_SECRET="$(/usr/local/bin/store_secret.sh generate MEET-ADMIN-SECRET)"
MEET_API_KEY="$(/usr/local/bin/store_secret.sh generate MEET-API-KEY)"
LIVEKIT_API_KEY="$(/usr/local/bin/store_secret.sh generate LIVEKIT-API-KEY "API" 12)"
LIVEKIT_API_SECRET="$(/usr/local/bin/store_secret.sh generate LIVEKIT-API-SECRET)"
ENABLED_MODULES="$(/usr/local/bin/store_secret.sh save ENABLED-MODULES "observability,openviduMeet,v2compatibility")"

# Base command
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/community/singlenode/$OPENVIDU_VERSION/install.sh)"

# Common arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=azure"
  "--deployment-type=single_node_pro"
  "--openvidu-pro-license=$OPENVIDU_PRO_LICENSE"
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
  "--meet-admin-user=$MEET_ADMIN_USER"
  "--meet-admin-password=$MEET_ADMIN_SECRET"
  "--meet-api-key=$MEET_API_KEY"
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
fi

# Certificate arguments
if [[ "${certificateType}" == "selfsigned" ]]; then
  CERT_ARGS=(
    "--certificate-type=selfsigned"
  )
elif [[ "${certificateType}" == "letsencrypt" ]]; then
  LETSENCRYPT_EMAIL=$(/usr/local/bin/store_secret.sh save LETSENCRYPT-EMAIL "${letsEncryptEmail}")
  CERT_ARGS=(
    "--certificate-type=letsencrypt"
    "--letsencrypt-email=${letsEncryptEmail}"
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

//DONE
var after_installScriptTemplate = '''
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
//DONE
var update_config_from_secretScriptTemplate = '''
#!/bin/bash -x
set -e

az login --identity --allow-no-subscriptions > /dev/null

# Installation directory
INSTALL_DIR="/opt/openvidu"
CONFIG_DIR="${INSTALL_DIR}/config"

# Replace DOMAIN_NAME
export DOMAIN=$(az keyvault secret show --vault-name ${keyVaultName} --name DOMAIN-NAME --query value -o tsv)
if [[ -n "$DOMAIN" ]]; then
    sed -i "s/DOMAIN_NAME=.*/DOMAIN_NAME=$DOMAIN/" "${CONFIG_DIR}/openvidu.env"
else
    exit 1
fi

# Replace LIVEKIT_TURN_DOMAIN_NAME
export LIVEKIT_TURN_DOMAIN_NAME=$(az keyvault secret show --vault-name ${keyVaultName} --name LIVEKIT-TURN-DOMAIN-NAME --query value -o tsv)
if [[ -n "$LIVEKIT_TURN_DOMAIN_NAME" ]]; then
    sed -i "s/LIVEKIT_TURN_DOMAIN_NAME=.*/LIVEKIT_TURN_DOMAIN_NAME=$LIVEKIT_TURN_DOMAIN_NAME/" "${CONFIG_DIR}/openvidu.env"
fi

if [[ ${certificateType} == "letsencrypt" ]]; then
    export LETSENCRYPT_EMAIL=$(az keyvault secret show --vault-name ${keyVaultName} --name LETSENCRYPT-EMAIL --query value -o tsv)
    sed -i "s/LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL/" "${CONFIG_DIR}/openvidu.env"
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
export MEET_ADMIN_USER=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-ADMIN-USER --query value -o tsv)
export MEET_ADMIN_SECRET=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-ADMIN-SECRET --query value -o tsv)
export MEET_API_KEY=$(az keyvault secret show --vault-name ${keyVaultName} --name MEET-API-KEY --query value -o tsv)
export ENABLED_MODULES=$(az keyvault secret show --vault-name ${keyVaultName} --name ENABLED-MODULES --query value -o tsv)


# Replace rest of the values
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/OPENVIDU_RTC_ENGINE=.*/OPENVIDU_RTC_ENGINE=$OPENVIDU_RTC_ENGINE/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/OPENVIDU_PRO_LICENSE=.*/OPENVIDU_PRO_LICENSE=$OPENVIDU_PRO_LICENSE/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_ADMIN_USERNAME=.*/MONGO_ADMIN_USERNAME=$MONGO_ADMIN_USERNAME/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_ADMIN_PASSWORD=.*/MONGO_ADMIN_PASSWORD=$MONGO_ADMIN_PASSWORD/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_REPLICA_SET_KEY=.*/MONGO_REPLICA_SET_KEY=$MONGO_REPLICA_SET_KEY/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/DASHBOARD_ADMIN_USERNAME=.*/DASHBOARD_ADMIN_USERNAME=$DASHBOARD_ADMIN_USERNAME/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/DASHBOARD_ADMIN_PASSWORD=.*/DASHBOARD_ADMIN_PASSWORD=$DASHBOARD_ADMIN_PASSWORD/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/MINIO_ACCESS_KEY=.*/MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/MINIO_SECRET_KEY=.*/MINIO_SECRET_KEY=$MINIO_SECRET_KEY/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/GRAFANA_ADMIN_USERNAME=.*/GRAFANA_ADMIN_USERNAME=$GRAFANA_ADMIN_USERNAME/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/LIVEKIT_API_KEY=.*/LIVEKIT_API_KEY=$LIVEKIT_API_KEY/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/LIVEKIT_API_SECRET=.*/LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET/" "${CONFIG_DIR}/openvidu.env"
sed -i "s/MEET_ADMIN_USER=.*/MEET_ADMIN_USER=$MEET_ADMIN_USER/" "${CONFIG_DIR}/meet.env"
sed -i "s/MEET_ADMIN_SECRET=.*/MEET_ADMIN_SECRET=$MEET_ADMIN_SECRET/" "${CONFIG_DIR}/meet.env"
sed -i "s/MEET_API_KEY=.*/MEET_API_KEY=$MEET_API_KEY/" "${CONFIG_DIR}/meet.env"
sed -i "s/ENABLED_MODULES=.*/ENABLED_MODULES=$ENABLED_MODULES/" "${CONFIG_DIR}/openvidu.env"


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

//DONE
var update_secret_from_configScriptTemplate = '''
#!/bin/bash
set -e

az login --identity --allow-no-subscriptions > /dev/null

# Installation directory
INSTALL_DIR="/opt/openvidu"
CONFIG_DIR="${INSTALL_DIR}/config"

if [[ ${certificateType} == "letsencrypt" ]]; then
  LETSENCRYPT_EMAIL="$(/usr/local/bin/get_value_from_config.sh LETSENCRYPT_EMAIL "${CONFIG_DIR}/openvidu.env")"
  az keyvault secret set --vault-name ${keyVaultName} --name "LETSENCRYPT-EMAIL" --value $LETSENCRYPT_EMAIL
fi

# Get current values of the config
REDIS_PASSWORD="$(/usr/local/bin/get_value_from_config.sh REDIS_PASSWORD "${CONFIG_DIR}/openvidu.env")"
DOMAIN_NAME="$(/usr/local/bin/get_value_from_config.sh DOMAIN_NAME "${CONFIG_DIR}/openvidu.env")"
LIVEKIT_TURN_DOMAIN_NAME="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_TURN_DOMAIN_NAME "${CONFIG_DIR}/openvidu.env")"
OPENVIDU_RTC_ENGINE="$(/usr/local/bin/get_value_from_config.sh OPENVIDU_RTC_ENGINE "${CONFIG_DIR}/openvidu.env")"
OPENVIDU_PRO_LICENSE="$(/usr/local/bin/get_value_from_config.sh OPENVIDU_PRO_LICENSE "${CONFIG_DIR}/openvidu.env")"
MONGO_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh MONGO_ADMIN_USERNAME "${CONFIG_DIR}/openvidu.env")"
MONGO_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh MONGO_ADMIN_PASSWORD "${CONFIG_DIR}/openvidu.env")"
MONGO_REPLICA_SET_KEY="$(/usr/local/bin/get_value_from_config.sh MONGO_REPLICA_SET_KEY "${CONFIG_DIR}/openvidu.env")"
MINIO_ACCESS_KEY="$(/usr/local/bin/get_value_from_config.sh MINIO_ACCESS_KEY "${CONFIG_DIR}/openvidu.env")"
MINIO_SECRET_KEY="$(/usr/local/bin/get_value_from_config.sh MINIO_SECRET_KEY "${CONFIG_DIR}/openvidu.env")"
DASHBOARD_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh DASHBOARD_ADMIN_USERNAME "${CONFIG_DIR}/openvidu.env")"
DASHBOARD_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh DASHBOARD_ADMIN_PASSWORD "${CONFIG_DIR}/openvidu.env")"
GRAFANA_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh GRAFANA_ADMIN_USERNAME "${CONFIG_DIR}/openvidu.env")"
GRAFANA_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh GRAFANA_ADMIN_PASSWORD "${CONFIG_DIR}/openvidu.env")"
LIVEKIT_API_KEY="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_API_KEY "${CONFIG_DIR}/openvidu.env")"
LIVEKIT_API_SECRET="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_API_SECRET "${CONFIG_DIR}/openvidu.env")"
MEET_ADMIN_USER="$(/usr/local/bin/get_value_from_config.sh MEET_ADMIN_USER "${CONFIG_DIR}/meet.env")"
MEET_ADMIN_SECRET="$(/usr/local/bin/get_value_from_config.sh MEET_ADMIN_SECRET "${CONFIG_DIR}/meet.env")"
MEET_API_KEY="$(/usr/local/bin/get_value_from_config.sh MEET_API_KEY "${CONFIG_DIR}/meet.env")"
ENABLED_MODULES="$(/usr/local/bin/get_value_from_config.sh ENABLED_MODULES "${CONFIG_DIR}/openvidu.env")"


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
az keyvault secret set --vault-name ${keyVaultName} --name MEET-ADMIN-USER --value $MEET_ADMIN_USER
az keyvault secret set --vault-name ${keyVaultName} --name MEET-ADMIN-SECRET --value $MEET_ADMIN_SECRET
az keyvault secret set --vault-name ${keyVaultName} --name MEET-API-KEY --value $MEET_API_KEY
az keyvault secret set --vault-name ${keyVaultName} --name ENABLED-MODULES --value $ENABLED_MODULES
'''

//DONE
var get_value_from_configScript = '''
#!/bin/bash -x
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

//DONE
var store_secretScriptTemplate = '''
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

var check_app_ready = '''
#!/bin/bash
while true; do
  HTTP_STATUS=$(curl -Ik http://localhost:7880 | head -n1 | awk '{print $2}')
  if [ $HTTP_STATUS == 200 ]; then
    break
  fi
  sleep 5
done
'''

var restart = '''
#!/bin/bash -x
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
CONFIG_DIR="${INSTALL_DIR}/config"

az login --identity

# Config azure blob storage
AZURE_ACCOUNT_NAME="${storageAccountName}"
AZURE_ACCOUNT_KEY=$(az storage account keys list --account-name ${storageAccountName} --query '[0].value' -o tsv)
AZURE_CONTAINER_NAME="${storageAccountContainerName}"

sed -i "s|AZURE_ACCOUNT_NAME=.*|AZURE_ACCOUNT_NAME=$AZURE_ACCOUNT_NAME|" "${CONFIG_DIR}/openvidu.env"
sed -i "s|AZURE_ACCOUNT_KEY=.*|AZURE_ACCOUNT_KEY=$AZURE_ACCOUNT_KEY|" "${CONFIG_DIR}/openvidu.env"
sed -i "s|AZURE_CONTAINER_NAME=.*|AZURE_CONTAINER_NAME=$AZURE_CONTAINER_NAME|" "${CONFIG_DIR}/openvidu.env"
'''

var formattedTemplateInstallScript = reduce(
  items(stringInterpolationParams),
  { value: installScriptTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var after_installScriptMaster = reduce(
  items(stringInterpolationParams),
  { value: after_installScriptTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var update_config_from_secretScript = reduce(
  items(stringInterpolationParams),
  { value: update_config_from_secretScriptTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var update_secret_from_configScript = reduce(
  items(stringInterpolationParams),
  { value: update_secret_from_configScriptTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

var store_secretScript = reduce(
  items(stringInterpolationParams),
  { value: store_secretScriptTemplate },
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

var base64install = base64(formattedTemplateInstallScript)
var base64after_install = base64(after_installScriptMaster)
var base64update_config_from_secret = base64(update_config_from_secretScript)
var base64update_secret_from_config = base64(update_secret_from_configScript)
var base64get_value_from_config = base64(get_value_from_configScript)
var base64store_secret = base64(store_secretScript)
var base64check_app_ready = base64(check_app_ready)
var base64restart = base64(restart)
var base64config_blobStorage = base64(config_blobStorageScript)

var userDataParams = {
  base64install: base64install
  base64after_install: base64after_install
  base64update_config_from_secret: base64update_config_from_secret
  base64update_secret_from_config: base64update_secret_from_config
  base64get_value_from_config: base64get_value_from_config
  base64store_secret: base64store_secret
  base64check_app_ready: base64check_app_ready
  base64restart: base64restart
  base64config_blobStorage: base64config_blobStorage
}

var userDataTemplate = '''
#!/bin/bash -x
set -eu -o pipefail

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

echo ${base64check_app_ready} | base64 -d > /usr/local/bin/check_app_ready.sh
chmod +x /usr/local/bin/check_app_ready.sh

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

# Wait for the app
/usr/local/bin/check_app_ready.sh
'''

var userData = reduce(
  items(userDataParams),
  { value: userDataTemplate },
  (curr, next) => { value: replace(curr.value, '\${${next.key}}', next.value) }
).value

resource openviduServer 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  name: openviduVMSettings.vmName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    hardwareProfile: {
      vmSize: instanceType
    }
    storageProfile: {
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: openviduVMSettings.osDiskType
        }
        diskSizeGB: 100
      }
      imageReference: openviduVMSettings.ubuntuOSVersion
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: netInterface_OV.id
        }
      ]
    }
    osProfile: {
      computerName: openviduVMSettings.vmName
      adminUsername: adminUsername
      linuxConfiguration: openviduVMSettings.linuxConfiguration
    }
    userData: base64(userData)
  }
}

resource roleAssignmentOpenViduServer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('roleAssignmentForOpenViduServer${openviduServer.name}')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: openviduServer.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
/*------------------------------------------- NETWORK -------------------------------------------*/

//Create publicIPAddress if convinient
resource publicIP_OV 'Microsoft.Network/publicIPAddresses@2023-11-01' = if (isEmptyIp == true) {
  name: '${stackName}-publicIP'
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
      fqdn: isEmptyDomain ? null : domainName
    }
  }
}

var ipExists = publicIpAddressObject.newOrExistingOrNone == 'existing'

resource publicIP_OV_ifExisting 'Microsoft.Network/publicIPAddresses@2023-11-01' existing = if (ipExists == true) {
  name: publicIpAddressObject.name
}

var ipNew = publicIpAddressObject.newOrExistingOrNone == 'new'

resource publicIP_OV_ifNew 'Microsoft.Network/publicIPAddresses@2023-11-01' existing = if (ipNew == true) {
  name: publicIpAddressObject.name
}

// Create the virtual network
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
        name: networkSettings.subnetName
        properties: {
          addressPrefix: networkSettings.subnetAddressPrefix
          privateEndpointNetworkPolicies: 'Disabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
          networkSecurityGroup: {
            id: webServerSecurityGroup.id
          }
        }
      }
    ]
  }
}

resource netInterface_OV 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: networkSettings.netInterfaceName
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: resourceId('Microsoft.Network/virtualNetworks/subnets', vnet_OV.name, networkSettings.subnetName)
          }
          publicIPAddress: {
            id: isEmptyIp ? publicIP_OV.id : ipNew ? publicIP_OV_ifNew.id : publicIP_OV_ifExisting.id
          }
        }
      }
    ]
    networkSecurityGroup: {
      id: webServerSecurityGroup.id
    }
  }
}

// SecurityGroup for OpenviduSN
resource webServerSecurityGroup 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: '${stackName}-nsg'
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
        name: 'TURN'
        properties: {
          protocol: 'Udp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
          access: 'Allow'
          priority: 130
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
          priority: 140
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
          priority: 150
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
          priority: 160
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
          priority: 170
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
          priority: 180
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
          priority: 190
          direction: 'Inbound'
        }
      }
    ]
  }
}

/*------------------------------------------- STORAGE ACCOUNT ----------------------------------------*/

@description('Name of an existing storage account. It is essential that this parameter is filled just when you want to save recordings and still using the same container after an update. If not specified, a new storage account will be generated.')
param storageAccountName string = ''

var isEmptyStorageAccountName = storageAccountName == ''

@description('Name of the bucket where OpenVidu will store the recordings if a new Storage account is being creating. If not specified, a default bucket will be created. If you want to use an existing storage account, fill this parameter with the name of the container where the recordings are stored.')
param containerName string = ''

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
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

var isEmptyContainerName = containerName == ''

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: isEmptyContainerName
    ? '${storageAccount.name}/default/openvidu-appdata'
    : '${storageAccount.name}/default/${containerName}'
  properties: {
    publicAccess: 'None'
  }
}
