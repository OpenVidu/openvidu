# Enable APIs the deployment needs
resource "google_project_service" "compute_api" { service = "compute.googleapis.com" }
resource "google_project_service" "secretmanager_api" { service = "secretmanager.googleapis.com" }
resource "google_project_service" "storage_api" { service = "storage.googleapis.com" }
resource "google_project_service" "iam_api" { service = "iam.googleapis.com" }
resource "google_project_service" "cloudresourcemanager_api" { service = "cloudresourcemanager.googleapis.com" }


resource "random_id" "bucket_suffix" { byte_length = 3 }

# Secret Manager secrets for OpenVidu deployment information
resource "google_secret_manager_secret" "openvidu_shared_info" {
  for_each = toset([
    "OPENVIDU_URL", "MEET_INITIAL_ADMIN_USER", "MEET_INITIAL_ADMIN_PASSWORD",
    "MEET_INITIAL_API_KEY", "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
    "DASHBOARD_URL", "GRAFANA_URL", "MINIO_URL", "DOMAIN_NAME", "LIVEKIT_TURN_DOMAIN_NAME",
    "OPENVIDU_PRO_LICENSE", "OPENVIDU_RTC_ENGINE", "REDIS_PASSWORD", "MONGO_ADMIN_USERNAME",
    "MONGO_ADMIN_PASSWORD", "MONGO_REPLICA_SET_KEY", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY",
    "DASHBOARD_ADMIN_USERNAME", "DASHBOARD_ADMIN_PASSWORD", "GRAFANA_ADMIN_USERNAME",
    "GRAFANA_ADMIN_PASSWORD", "ENABLED_MODULES", "OPENVIDU_VERSION", "ALL_SECRETS_GENERATED"
  ])

  secret_id = each.key
  replication {
    auto {}
  }
}

# GCS bucket
resource "google_storage_bucket" "bucket" {
  count                       = local.isEmpty ? 1 : 0
  name                        = "${var.projectId}-openvidu-${var.stackName}-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

# Service account for the instance
resource "google_service_account" "service_account" {
  account_id   = lower("${substr(var.stackName, 0, 12)}-sa")
  display_name = "OpenVidu instance service account"
}

# IAM bindings for the service account so the instance can access Secret Manager and GCS
resource "google_project_iam_member" "iam_project_role" {
  project = var.projectId
  role    = "roles/owner"
  member  = "serviceAccount:${google_service_account.service_account.email}"
}

resource "google_compute_firewall" "firewall_master" {
  name    = lower("${var.stackName}-master-firewall")
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443", "1935", "7881", "6379", "27017", "9000", "3000"]
  }
  allow {
    protocol = "udp"
    ports    = ["443", "7885", "50000-60000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = [lower("${var.stackName}-master-node")]
}

resource "google_compute_firewall" "firewall_media" {
  name    = lower("${var.stackName}-media-firewall")
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "7880", "1935", "7881"]
  }
  allow {
    protocol = "udp"
    ports    = ["7885", "50000-60000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = [lower("${var.stackName}-media-node")]
}

resource "google_compute_firewall" "firewall_internal" {
  name    = lower("${var.stackName}-internal-firewall")
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_tags = [
    lower("${var.stackName}-master-node"),
    lower("${var.stackName}-media-node")
  ]
  target_tags = [
    lower("${var.stackName}-master-node"),
    lower("${var.stackName}-media-node")
  ]
}

# Create Public Ip address (if not provided)
resource "google_compute_address" "public_ip_address" {
  count  = var.publicIpAddress == "" ? 1 : 0
  name   = lower("${var.stackName}-public-ip")
  region = var.region
}

# Compute instance for OpenVidu
resource "google_compute_instance" "openvidu_master_node" {
  name         = lower("${var.stackName}-master-node")
  machine_type = var.instanceType
  zone         = var.zone

  tags = [lower("${var.stackName}-master-node")]

  boot_disk {
    initialize_params {
      image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts"
      size  = 100
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = var.publicIpAddress == "" ? google_compute_address.public_ip_address[0].address : var.publicIpAddress
    }
  }

  metadata = {
    # metadata values are accessible from the instance
    publicIpAddress           = var.publicIpAddress == "" ? google_compute_address.public_ip_address[0].address : var.publicIpAddress
    region                    = var.region
    stackName                 = var.stackName
    certificateType           = var.certificateType
    domainName                = var.domainName
    ownPublicCertificate      = var.ownPublicCertificate
    ownPrivateCertificate     = var.ownPrivateCertificate
    openviduLicense           = var.openviduLicense
    rtcEngine                 = var.rtcEngine
    initialMeetAdminPassword  = var.initialMeetAdminPassword
    initialMeetApiKey         = var.initialMeetApiKey
    additionalInstallFlags    = var.additionalInstallFlags
    turnDomainName            = var.turnDomainName
    turnOwnPublicCertificate  = var.turnOwnPublicCertificate
    turnOwnPrivateCertificate = var.turnOwnPrivateCertificate
    bucketName                = local.isEmpty ? google_storage_bucket.bucket[0].name : var.bucketName
  }

  service_account {
    email  = google_service_account.service_account.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata_startup_script = local.user_data_master

  labels = {
    stack     = var.stackName
    node-type = "master"
  }
}

# Media Node Instance Template
resource "google_compute_instance_template" "media_node_template" {
  name         = lower("${var.stackName}-media-node-template")
  machine_type = var.mediaNodeInstanceType

  tags = [lower("${var.stackName}-media-node")]

  disk {
    source_image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts"
    auto_delete  = true
    boot         = true
    disk_size_gb = 100
    disk_type    = "pd-standard"
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    stackName           = var.stackName
    masterNodePrivateIP = google_compute_instance.openvidu_master_node.network_interface[0].network_ip
    bucketName          = local.isEmpty ? google_storage_bucket.bucket[0].name : var.bucketName
    region              = var.region
  }

  service_account {
    email  = google_service_account.service_account.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata_startup_script = local.user_data_media

  labels = {
    stack     = var.stackName
    node-type = "media"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Managed Instance Group for Media Nodes
resource "google_compute_region_instance_group_manager" "media_node_group" {
  name               = lower("${var.stackName}-media-node-group")
  base_instance_name = lower("${var.stackName}-media-node")
  region             = var.region
  target_size        = var.initialNumberOfMediaNodes

  version {
    instance_template = google_compute_instance_template.media_node_template.self_link_unique
  }

  named_port {
    name = "http"
    port = 7880
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.media_node_health_check.self_link
    initial_delay_sec = 300
  }

  depends_on = [google_compute_instance.openvidu_master_node]
}

# Health Check for Media Nodes
resource "google_compute_health_check" "media_node_health_check" {
  name = lower("${var.stackName}-media-node-health-check")

  timeout_sec        = 5
  check_interval_sec = 10

  http_health_check {
    port         = 7880
    request_path = "/livekit/healthz"
  }
}

# Autoscaler for Media Nodes
resource "google_compute_region_autoscaler" "media_node_autoscaler" {
  name   = lower("${var.stackName}-media-node-autoscaler")
  region = var.region
  target = google_compute_region_instance_group_manager.media_node_group.self_link

  autoscaling_policy {
    max_replicas    = var.maxNumberOfMediaNodes
    min_replicas    = var.minNumberOfMediaNodes
    cooldown_period = var.scaleOutCooldownPeriod

    cpu_utilization {
      target = var.scaleTargetCPU / 100.0
    }

    scale_in_control {
      max_scaled_in_replicas {
        fixed = 1
      }
      time_window_sec = var.scaleInCooldownPeriod
    }

    mode = "ON"
  }
}

# ------------------------- local values -------------------------

locals {
  isEmpty               = var.bucketName == ""
  install_script_master = <<-EOF
#!/bin/bash -x
set -e

OPENVIDU_VERSION=main
DOMAIN=
YQ_VERSION=v4.44.5
apt-get update && apt-get install -y \
  curl \
  unzip \
  jq \
  wget \
  ca-certificates \
  gnupg \
  lsb-release \
  openssl

wget https://github.com/mikefarah/yq/releases/download/$${YQ_VERSION}/yq_linux_amd64.tar.gz -O - |\
tar xz && mv yq_linux_amd64 /usr/bin/yq

# Configure gcloud with instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true
METADATA_URL="http://metadata.google.internal/computeMetadata/v1"
get_meta() { curl -s -H "Metadata-Flavor: Google" "$${METADATA_URL}/$1"; }

# Create counter file for tracking script executions
echo 1 > /usr/local/bin/openvidu_install_counter.txt

# Configure domain
if [[ "${var.domainName}" == "" ]]; then
  [ ! -d "/usr/share/openvidu" ] && mkdir -p /usr/share/openvidu
  EXTERNAL_IP=$(get_meta "instance/network-interfaces/0/access-configs/0/external-ip")
  RANDOM_DOMAIN_STRING=$(tr -dc 'a-z' < /dev/urandom | head -c 8)
  DOMAIN=openvidu-$RANDOM_DOMAIN_STRING-$(echo $EXTERNAL_IP | tr '.' '-').sslip.io
  TURN_DOMAIN_NAME_SSLIP_IO=turn-$RANDOM_DOMAIN_STRING-$(echo $EXTERNAL_IP | tr '.' '-').sslip.io
else
  DOMAIN="${var.domainName}"
fi
DOMAIN="$(/usr/local/bin/store_secret.sh save DOMAIN_NAME "$DOMAIN")"

# Meet initial admin user and password
MEET_INITIAL_ADMIN_USER="$(/usr/local/bin/store_secret.sh save MEET_INITIAL_ADMIN_USER "admin")"
if [[ "${var.initialMeetAdminPassword}" != '' ]]; then
  MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh save MEET_INITIAL_ADMIN_PASSWORD "${var.initialMeetAdminPassword}")"
else
  MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate MEET_INITIAL_ADMIN_PASSWORD)"
fi

if [[ "${var.initialMeetApiKey}" != '' ]]; then
  MEET_INITIAL_API_KEY="$(/usr/local/bin/store_secret.sh save MEET_INITIAL_API_KEY "${var.initialMeetApiKey}")"
fi

#Get own private IP
PRIVATE_IP=$(get_meta "instance/network-interfaces/0/ip")

# Store usernames and generate random passwords
REDIS_PASSWORD="$(/usr/local/bin/store_secret.sh generate REDIS_PASSWORD)"
MONGO_ADMIN_USERNAME="$(/usr/local/bin/store_secret.sh save MONGO_ADMIN_USERNAME "mongoadmin")"
MONGO_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate MONGO_ADMIN_PASSWORD)"
MONGO_REPLICA_SET_KEY="$(/usr/local/bin/store_secret.sh generate MONGO_REPLICA_SET_KEY)"
MINIO_ACCESS_KEY="$(/usr/local/bin/store_secret.sh save MINIO_ACCESS_KEY "minioadmin")"
MINIO_SECRET_KEY="$(/usr/local/bin/store_secret.sh generate MINIO_SECRET_KEY)"
DASHBOARD_ADMIN_USERNAME="$(/usr/local/bin/store_secret.sh save DASHBOARD_ADMIN_USERNAME "dashboardadmin")"
DASHBOARD_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate DASHBOARD_ADMIN_PASSWORD)"
GRAFANA_ADMIN_USERNAME="$(/usr/local/bin/store_secret.sh save GRAFANA_ADMIN_USERNAME "grafanaadmin")"
GRAFANA_ADMIN_PASSWORD="$(/usr/local/bin/store_secret.sh generate GRAFANA_ADMIN_PASSWORD)"
ENABLED_MODULES="$(/usr/local/bin/store_secret.sh save ENABLED_MODULES "observability,openviduMeet")"
LIVEKIT_API_KEY="$(/usr/local/bin/store_secret.sh generate LIVEKIT_API_KEY "API" 12)"
LIVEKIT_API_SECRET="$(/usr/local/bin/store_secret.sh generate LIVEKIT_API_SECRET)"

# Store OpenVidu Pro license and RTC engine and Openvidu version
OPENVIDU_PRO_LICENSE="$(/usr/local/bin/store_secret.sh save OPENVIDU_PRO_LICENSE "${var.openviduLicense}")"
OPENVIDU_RTC_ENGINE="$(/usr/local/bin/store_secret.sh save OPENVIDU_RTC_ENGINE "${var.rtcEngine}")"
OPENVIDU_VERSION="$(/usr/local/bin/store_secret.sh save OPENVIDU_VERSION "$OPENVIDU_VERSION")"

ALL_SECRETS_GENERATED="$(/usr/local/bin/store_secret.sh save ALL_SECRETS_GENERATED "true")"

# Build install command and args
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/elastic/$OPENVIDU_VERSION/install_ov_master_node.sh)"

# Common arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=gcp"
  "--deployment-type=elastic"
  "--node-role=master-node"
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
if [[ "${var.additionalInstallFlags}" != "" ]]; then
  IFS=',' read -ra EXTRA_FLAGS <<< "${var.additionalInstallFlags}"
  for extra_flag in "$${EXTRA_FLAGS[@]}"; do
    # Trim whitespace around each flag
    extra_flag="$(echo -e "$${extra_flag}" | sed -e 's/^[ \t]*//' -e 's/[ \t]*$//')"
    if [[ "$extra_flag" != "" ]]; then
      COMMON_ARGS+=("$extra_flag")
    fi
  done
fi

# Turn with TLS
if [[ "$TURN_DOMAIN_NAME_SSLIP_IO" != "" ]]; then
  LIVEKIT_TURN_DOMAIN_NAME=$(/usr/local/bin/store_secret.sh save LIVEKIT_TURN_DOMAIN_NAME "$TURN_DOMAIN_NAME_SSLIP_IO")
  COMMON_ARGS+=(
    "--turn-domain-name=$LIVEKIT_TURN_DOMAIN_NAME"
  )
elif [[ "${var.turnDomainName}" != '' ]]; then
  LIVEKIT_TURN_DOMAIN_NAME=$(/usr/local/bin/store_secret.sh save LIVEKIT_TURN_DOMAIN_NAME "${var.turnDomainName}")
  COMMON_ARGS+=(
    "--turn-domain-name=$LIVEKIT_TURN_DOMAIN_NAME"
  )
fi

# Certificate arguments
if [[ "${var.certificateType}" == "selfsigned" ]]; then
  CERT_ARGS=(
    "--certificate-type=selfsigned"
  )
elif [[ "${var.certificateType}" == "letsencrypt" ]]; then
  CERT_ARGS=(
    "--certificate-type=letsencrypt"
  )
else
  # Download owncert files
  mkdir -p /tmp/owncert
  wget -O /tmp/owncert/fullchain.pem ${var.ownPublicCertificate}
  wget -O /tmp/owncert/privkey.pem ${var.ownPrivateCertificate}

  # Convert to base64
  OWN_CERT_CRT=$(base64 -w 0 /tmp/owncert/fullchain.pem)
  OWN_CERT_KEY=$(base64 -w 0 /tmp/owncert/privkey.pem)
  CERT_ARGS=(
    "--certificate-type=owncert"
    "--owncert-public-key=$OWN_CERT_CRT"
    "--owncert-private-key=$OWN_CERT_KEY"
  )

  # Turn with TLS and own certificate
  if [[ "${var.turnDomainName}" != '' ]]; then
    # Download owncert files
    mkdir -p /tmp/owncert-turn
    wget -O /tmp/owncert-turn/fullchain.pem ${var.turnOwnPublicCertificate}
    wget -O /tmp/owncert-turn/privkey.pem ${var.turnOwnPrivateCertificate}
    # Convert to base64
    OWN_CERT_CRT_TURN=$(base64 -w 0 /tmp/owncert-turn/fullchain.pem)
    OWN_CERT_KEY_TURN=$(base64 -w 0 /tmp/owncert-turn/privkey.pem)
    CERT_ARGS+=(
      "--turn-owncert-private-key=$OWN_CERT_KEY_TURN"
      "--turn-owncert-public-key=$OWN_CERT_CRT_TURN"
    )
  fi
fi

# Final command
FINAL_COMMAND="$INSTALL_COMMAND $(printf "%s " "$${COMMON_ARGS[@]}") $(printf "%s " "$${CERT_ARGS[@]}")"

# Execute installation
exec bash -c "$FINAL_COMMAND"
EOF

  config_s3_script = <<-EOF
#!/bin/bash -x
set -e

# Configure gcloud with instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true

# Install dir and config dir
INSTALL_DIR="/opt/openvidu"
CLUSTER_CONFIG_DIR="$${INSTALL_DIR}/config/cluster"

METADATA_URL="http://metadata.google.internal/computeMetadata/v1"
get_meta() { curl -s -H "Metadata-Flavor: Google" "$${METADATA_URL}/$1"; }
SERVICE_ACCOUNT_EMAIL=$(get_meta "instance/service-accounts/default/email")

# Create key for service account
gcloud iam service-accounts keys create credentials.json --iam-account=$SERVICE_ACCOUNT_EMAIL

# Create HMAC key and parse output
HMAC_OUTPUT=$(gcloud storage hmac create $SERVICE_ACCOUNT_EMAIL --format="json")
EXTERNAL_S3_ACCESS_KEY=$(echo "$HMAC_OUTPUT" | jq -r '.metadata.accessId')
EXTERNAL_S3_SECRET_KEY=$(echo "$HMAC_OUTPUT" | jq -r '.secret')

# Config S3 bucket
EXTERNAL_S3_ENDPOINT="https://storage.googleapis.com"
EXTERNAL_S3_REGION="${var.region}"
EXTERNAL_S3_PATH_STYLE_ACCESS="true"
EXTERNAL_S3_BUCKET_APP_DATA=$(get_meta "instance/attributes/bucketName")

# Update egress.yaml to use hardcoded credentials instead of env variable
if [ -f "$${CLUSTER_CONFIG_DIR}/egress.yaml" ]; then
  yq eval --inplace '.storage.gcp.credentials_json = (load("/credentials.json") | tostring) | .storage.gcp.credentials_json style="single"' /opt/openvidu/config/egress.yaml
fi

sed -i "s|EXTERNAL_S3_ENDPOINT=.*|EXTERNAL_S3_ENDPOINT=$EXTERNAL_S3_ENDPOINT|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_REGION=.*|EXTERNAL_S3_REGION=$EXTERNAL_S3_REGION|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_PATH_STYLE_ACCESS=.*|EXTERNAL_S3_PATH_STYLE_ACCESS=$EXTERNAL_S3_PATH_STYLE_ACCESS|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_BUCKET_APP_DATA=.*|EXTERNAL_S3_BUCKET_APP_DATA=$EXTERNAL_S3_BUCKET_APP_DATA|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_ACCESS_KEY=.*|EXTERNAL_S3_ACCESS_KEY=$EXTERNAL_S3_ACCESS_KEY|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_SECRET_KEY=.*|EXTERNAL_S3_SECRET_KEY=$EXTERNAL_S3_SECRET_KEY|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
EOF

  after_install_script = <<-EOF
#!/bin/bash
set -e

# Configure gcloud with instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true

# Generate URLs
DOMAIN=$(gcloud secrets versions access latest --secret=DOMAIN_NAME)
OPENVIDU_URL="https://$${DOMAIN}/"
LIVEKIT_URL="wss://$${DOMAIN}/"
DASHBOARD_URL="https://$${DOMAIN}/dashboard/"
GRAFANA_URL="https://$${DOMAIN}/grafana/"
MINIO_URL="https://$${DOMAIN}/minio-console/"

# Update shared secret
echo -n "$DOMAIN" | gcloud secrets versions add DOMAIN_NAME --data-file=-
echo -n "$OPENVIDU_URL" | gcloud secrets versions add OPENVIDU_URL --data-file=-
echo -n "$LIVEKIT_URL" | gcloud secrets versions add LIVEKIT_URL --data-file=-
echo -n "$DASHBOARD_URL" | gcloud secrets versions add DASHBOARD_URL --data-file=-
echo -n "$GRAFANA_URL" | gcloud secrets versions add GRAFANA_URL --data-file=-
echo -n "$MINIO_URL" | gcloud secrets versions add MINIO_URL --data-file=-
gcloud secrets versions access latest --secret=MINIO_URL
if [[ $? -ne 0 ]]; then
    echo "Error updating secret_manager"
fi
EOF

  update_config_from_secret_script = <<-EOF
#!/bin/bash -x
set -e

# Configure gcloud with instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true

# Installation directory
INSTALL_DIR="/opt/openvidu"
CLUSTER_CONFIG_DIR="$${INSTALL_DIR}/config/cluster"
MASTER_NODE_CONFIG_DIR="$${INSTALL_DIR}/config/node"

# Replace DOMAIN_NAME
export DOMAIN=$(gcloud secrets versions access latest --secret=DOMAIN_NAME)
if [[ -n "$DOMAIN" ]]; then
    sed -i "s/DOMAIN_NAME=.*/DOMAIN_NAME=$DOMAIN/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
else
    exit 1
fi

# Replace LIVEKIT_TURN_DOMAIN_NAME
export LIVEKIT_TURN_DOMAIN_NAME=$(gcloud secrets versions access latest --secret=LIVEKIT_TURN_DOMAIN_NAME)
if [[ -n "$LIVEKIT_TURN_DOMAIN_NAME" ]]; then
    sed -i "s/LIVEKIT_TURN_DOMAIN_NAME=.*/LIVEKIT_TURN_DOMAIN_NAME=$LIVEKIT_TURN_DOMAIN_NAME/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
fi

# Get the rest of the values
export REDIS_PASSWORD=$(gcloud secrets versions access latest --secret=REDIS_PASSWORD)
export OPENVIDU_RTC_ENGINE=$(gcloud secrets versions access latest --secret=OPENVIDU_RTC_ENGINE)
export OPENVIDU_PRO_LICENSE=$(gcloud secrets versions access latest --secret=OPENVIDU_PRO_LICENSE)
export MONGO_ADMIN_USERNAME=$(gcloud secrets versions access latest --secret=MONGO_ADMIN_USERNAME)
export MONGO_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=MONGO_ADMIN_PASSWORD)
export MONGO_REPLICA_SET_KEY=$(gcloud secrets versions access latest --secret=MONGO_REPLICA_SET_KEY)
export DASHBOARD_ADMIN_USERNAME=$(gcloud secrets versions access latest --secret=DASHBOARD_ADMIN_USERNAME)
export DASHBOARD_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=DASHBOARD_ADMIN_PASSWORD)
export MINIO_ACCESS_KEY=$(gcloud secrets versions access latest --secret=MINIO_ACCESS_KEY)
export MINIO_SECRET_KEY=$(gcloud secrets versions access latest --secret=MINIO_SECRET_KEY)
export GRAFANA_ADMIN_USERNAME=$(gcloud secrets versions access latest --secret=GRAFANA_ADMIN_USERNAME)
export GRAFANA_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=GRAFANA_ADMIN_PASSWORD)
export LIVEKIT_API_KEY=$(gcloud secrets versions access latest --secret=LIVEKIT_API_KEY)
export LIVEKIT_API_SECRET=$(gcloud secrets versions access latest --secret=LIVEKIT_API_SECRET)
export MEET_INITIAL_ADMIN_USER=$(gcloud secrets versions access latest --secret=MEET_INITIAL_ADMIN_USER)
export MEET_INITIAL_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=MEET_INITIAL_ADMIN_PASSWORD)
if [[ "${var.initialMeetApiKey}" != '' ]]; then
  export MEET_INITIAL_API_KEY=$(gcloud secrets versions access latest --secret=MEET_INITIAL_API_KEY)
fi
export ENABLED_MODULES=$(gcloud secrets versions access latest --secret=ENABLED_MODULES)

# Replace rest of the values
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "$${MASTER_NODE_CONFIG_DIR}/openvidu.env"
sed -i "s/OPENVIDU_RTC_ENGINE=.*/OPENVIDU_RTC_ENGINE=$OPENVIDU_RTC_ENGINE/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/OPENVIDU_PRO_LICENSE=.*/OPENVIDU_PRO_LICENSE=$OPENVIDU_PRO_LICENSE/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_ADMIN_USERNAME=.*/MONGO_ADMIN_USERNAME=$MONGO_ADMIN_USERNAME/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_ADMIN_PASSWORD=.*/MONGO_ADMIN_PASSWORD=$MONGO_ADMIN_PASSWORD/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MONGO_REPLICA_SET_KEY=.*/MONGO_REPLICA_SET_KEY=$MONGO_REPLICA_SET_KEY/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/DASHBOARD_ADMIN_USERNAME=.*/DASHBOARD_ADMIN_USERNAME=$DASHBOARD_ADMIN_USERNAME/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/DASHBOARD_ADMIN_PASSWORD=.*/DASHBOARD_ADMIN_PASSWORD=$DASHBOARD_ADMIN_PASSWORD/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MINIO_ACCESS_KEY=.*/MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MINIO_SECRET_KEY=.*/MINIO_SECRET_KEY=$MINIO_SECRET_KEY/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/GRAFANA_ADMIN_USERNAME=.*/GRAFANA_ADMIN_USERNAME=$GRAFANA_ADMIN_USERNAME/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/LIVEKIT_API_KEY=.*/LIVEKIT_API_KEY=$LIVEKIT_API_KEY/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/LIVEKIT_API_SECRET=.*/LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s/MEET_INITIAL_ADMIN_USER=.*/MEET_INITIAL_ADMIN_USER=$MEET_INITIAL_ADMIN_USER/" "$${CLUSTER_CONFIG_DIR}/meet.env"
sed -i "s/MEET_INITIAL_ADMIN_PASSWORD=.*/MEET_INITIAL_ADMIN_PASSWORD=$MEET_INITIAL_ADMIN_PASSWORD/" "$${CLUSTER_CONFIG_DIR}/meet.env"
if [[ "${var.initialMeetApiKey}" != '' ]]; then
  sed -i "s/MEET_INITIAL_API_KEY=.*/MEET_INITIAL_API_KEY=$MEET_INITIAL_API_KEY/" "$${CLUSTER_CONFIG_DIR}/meet.env"
fi
sed -i "s/ENABLED_MODULES=.*/ENABLED_MODULES=$ENABLED_MODULES/" "$${CLUSTER_CONFIG_DIR}/openvidu.env"

# Update URLs in secret
OPENVIDU_URL="https://$${DOMAIN}/"
LIVEKIT_URL="wss://$${DOMAIN}/"
DASHBOARD_URL="https://$${DOMAIN}/dashboard/"
GRAFANA_URL="https://$${DOMAIN}/grafana/"
MINIO_URL="https://$${DOMAIN}/minio-console/"

# Update shared secret
echo -n "$DOMAIN" | gcloud secrets versions add DOMAIN_NAME --data-file=-
echo -n "$OPENVIDU_URL" | gcloud secrets versions add OPENVIDU_URL --data-file=-
echo -n "$LIVEKIT_URL" | gcloud secrets versions add LIVEKIT_URL --data-file=-
echo -n "$DASHBOARD_URL" | gcloud secrets versions add DASHBOARD_URL --data-file=-
echo -n "$GRAFANA_URL" | gcloud secrets versions add GRAFANA_URL --data-file=-
echo -n "$MINIO_URL" | gcloud secrets versions add MINIO_URL --data-file=-
EOF

  update_secret_from_config_script = <<-EOF
#!/bin/bash
set -e

# Configure gcloud with instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true

# Installation directory
INSTALL_DIR="/opt/openvidu"
CLUSTER_CONFIG_DIR="$${INSTALL_DIR}/config/cluster"
MASTER_NODE_CONFIG_DIR="$${INSTALL_DIR}/config/node"

# Get current values of the config
REDIS_PASSWORD="$(/usr/local/bin/get_value_from_config.sh REDIS_PASSWORD "$${MASTER_NODE_CONFIG_DIR}/openvidu.env")"
DOMAIN_NAME="$(/usr/local/bin/get_value_from_config.sh DOMAIN_NAME "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
LIVEKIT_TURN_DOMAIN_NAME="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_TURN_DOMAIN_NAME "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
OPENVIDU_RTC_ENGINE="$(/usr/local/bin/get_value_from_config.sh OPENVIDU_RTC_ENGINE "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
OPENVIDU_PRO_LICENSE="$(/usr/local/bin/get_value_from_config.sh OPENVIDU_PRO_LICENSE "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
MONGO_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh MONGO_ADMIN_USERNAME "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
MONGO_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh MONGO_ADMIN_PASSWORD "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
MONGO_REPLICA_SET_KEY="$(/usr/local/bin/get_value_from_config.sh MONGO_REPLICA_SET_KEY "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
MINIO_ACCESS_KEY="$(/usr/local/bin/get_value_from_config.sh MINIO_ACCESS_KEY "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
MINIO_SECRET_KEY="$(/usr/local/bin/get_value_from_config.sh MINIO_SECRET_KEY "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
DASHBOARD_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh DASHBOARD_ADMIN_USERNAME "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
DASHBOARD_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh DASHBOARD_ADMIN_PASSWORD "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
GRAFANA_ADMIN_USERNAME="$(/usr/local/bin/get_value_from_config.sh GRAFANA_ADMIN_USERNAME "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
GRAFANA_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh GRAFANA_ADMIN_PASSWORD "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
LIVEKIT_API_KEY="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_API_KEY "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
LIVEKIT_API_SECRET="$(/usr/local/bin/get_value_from_config.sh LIVEKIT_API_SECRET "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
MEET_INITIAL_ADMIN_USER="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_ADMIN_USER "$${CLUSTER_CONFIG_DIR}/meet.env")"
MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_ADMIN_PASSWORD "$${CLUSTER_CONFIG_DIR}/meet.env")"
if [[ "${var.initialMeetApiKey}" != '' ]]; then
  MEET_INITIAL_API_KEY="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_API_KEY "$${CLUSTER_CONFIG_DIR}/meet.env")"
fi
ENABLED_MODULES="$(/usr/local/bin/get_value_from_config.sh ENABLED_MODULES "$${CLUSTER_CONFIG_DIR}/openvidu.env")"

# Update shared secret
echo -n "$REDIS_PASSWORD" | gcloud secrets versions add REDIS_PASSWORD --data-file=-
echo -n "$DOMAIN_NAME" | gcloud secrets versions add DOMAIN_NAME --data-file=-
echo -n "$LIVEKIT_TURN_DOMAIN_NAME" | gcloud secrets versions add LIVEKIT_TURN_DOMAIN_NAME --data-file=-
echo -n "$OPENVIDU_RTC_ENGINE" | gcloud secrets versions add OPENVIDU_RTC_ENGINE --data-file=-
echo -n "$OPENVIDU_PRO_LICENSE" | gcloud secrets versions add OPENVIDU_PRO_LICENSE --data-file=-
echo -n "$MONGO_ADMIN_USERNAME" | gcloud secrets versions add MONGO_ADMIN_USERNAME --data-file=-
echo -n "$MONGO_ADMIN_PASSWORD" | gcloud secrets versions add MONGO_ADMIN_PASSWORD --data-file=-
echo -n "$MONGO_REPLICA_SET_KEY" | gcloud secrets versions add MONGO_REPLICA_SET_KEY --data-file=-
echo -n "$MINIO_ACCESS_KEY" | gcloud secrets versions add MINIO_ACCESS_KEY --data-file=-
echo -n "$MINIO_SECRET_KEY" | gcloud secrets versions add MINIO_SECRET_KEY --data-file=-
echo -n "$DASHBOARD_ADMIN_USERNAME" | gcloud secrets versions add DASHBOARD_ADMIN_USERNAME --data-file=-
echo -n "$DASHBOARD_ADMIN_PASSWORD" | gcloud secrets versions add DASHBOARD_ADMIN_PASSWORD --data-file=-
echo -n "$GRAFANA_ADMIN_USERNAME" | gcloud secrets versions add GRAFANA_ADMIN_USERNAME --data-file=-
echo -n "$GRAFANA_ADMIN_PASSWORD" | gcloud secrets versions add GRAFANA_ADMIN_PASSWORD --data-file=-
echo -n "$LIVEKIT_API_KEY" | gcloud secrets versions add LIVEKIT_API_KEY --data-file=-
echo -n "$LIVEKIT_API_SECRET" | gcloud secrets versions add LIVEKIT_API_SECRET --data-file=-
echo -n "$MEET_INITIAL_ADMIN_USER" | gcloud secrets versions add MEET_INITIAL_ADMIN_USER --data-file=-
echo -n "$MEET_INITIAL_ADMIN_PASSWORD" | gcloud secrets versions add MEET_INITIAL_ADMIN_PASSWORD --data-file=-
if [[ "${var.initialMeetApiKey}" != '' ]]; then
  echo -n "$MEET_INITIAL_API_KEY" | gcloud secrets versions add MEET_INITIAL_API_KEY --data-file=-
fi
echo -n "$ENABLED_MODULES" | gcloud secrets versions add ENABLED_MODULES --data-file=-
EOF

  get_value_from_config_script = <<-EOF
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
  EOF

  store_secret_script = <<-EOF
#!/bin/bash
set -e

# Authenticate using instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true

# Modes: save, generate
# save mode: save the secret in the secret manager
# generate mode: generate a random password and save it in the secret manager
MODE="$1"
if [[ "$MODE" == "generate" ]]; then
    SECRET_KEY_NAME="$2"
    PREFIX="$${3:-}"
    LENGTH="$${4:-44}"
    RANDOM_PASSWORD="$(openssl rand -base64 64 | tr -d '+/=\n' | cut -c -$${LENGTH})"
    RANDOM_PASSWORD="$${PREFIX}$${RANDOM_PASSWORD}"
    echo -n "$RANDOM_PASSWORD" | gcloud secrets versions add $SECRET_KEY_NAME --data-file=-
    if [[ $? -ne 0 ]]; then
        echo "Error generating secret"
    fi
    echo "$RANDOM_PASSWORD"
elif [[ "$MODE" == "save" ]]; then
    SECRET_KEY_NAME="$2"
    SECRET_VALUE="$3"
    echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_KEY_NAME --data-file=-
    if [[ $? -ne 0 ]]; then
        echo "Error generating secret"
    fi
    echo "$SECRET_VALUE"
else
    exit 1
fi
EOF

  check_app_ready_script = <<-EOF
#!/bin/bash
while true; do
  HTTP_STATUS=$(curl -Ik http://localhost:7880 | head -n1 | awk '{print $2}')
  if [ $HTTP_STATUS == 200 ]; then
    break
  fi
  sleep 5
done
EOF

  restart_script = <<-EOF
#!/bin/bash -x
set -e

# Stop all services
systemctl stop openvidu

# Update config from secret
/usr/local/bin/update_config_from_secret.sh

# Start all services
systemctl start openvidu
EOF

  user_data_master = <<-EOF
#!/bin/bash -x
set -eu -o pipefail

# restart.sh
cat > /usr/local/bin/restart.sh << 'RESTART_EOF'
${local.restart_script}
RESTART_EOF
chmod +x /usr/local/bin/restart.sh

# Check if installation already completed
if [ -f /usr/local/bin/openvidu_install_counter.txt ]; then
  # Launch on reboot
  /usr/local/bin/restart.sh || { echo "[OpenVidu] error restarting OpenVidu"; exit 1; }
else
  # install.sh
  cat > /usr/local/bin/install.sh << 'INSTALL_EOF'
${local.install_script_master}
INSTALL_EOF
  chmod +x /usr/local/bin/install.sh

  # after_install.sh
  cat > /usr/local/bin/after_install.sh << 'AFTER_INSTALL_EOF'
${local.after_install_script}
AFTER_INSTALL_EOF
  chmod +x /usr/local/bin/after_install.sh

  # update_config_from_secret.sh
  cat > /usr/local/bin/update_config_from_secret.sh << 'UPDATE_CONFIG_EOF'
${local.update_config_from_secret_script}
UPDATE_CONFIG_EOF
  chmod +x /usr/local/bin/update_config_from_secret.sh

  # update_secret_from_config.sh
  cat > /usr/local/bin/update_secret_from_config.sh << 'UPDATE_SECRET_EOF'
${local.update_secret_from_config_script}
UPDATE_SECRET_EOF
  chmod +x /usr/local/bin/update_secret_from_config.sh

  # get_value_from_config.sh
  cat > /usr/local/bin/get_value_from_config.sh << 'GET_VALUE_EOF'
${local.get_value_from_config_script}
GET_VALUE_EOF
  chmod +x /usr/local/bin/get_value_from_config.sh

  # store_secret.sh
  cat > /usr/local/bin/store_secret.sh << 'STORE_SECRET_EOF'
${local.store_secret_script}
STORE_SECRET_EOF
  chmod +x /usr/local/bin/store_secret.sh

  # check_app_ready.sh
  cat > /usr/local/bin/check_app_ready.sh << 'CHECK_APP_EOF'
${local.check_app_ready_script}
CHECK_APP_EOF
  chmod +x /usr/local/bin/check_app_ready.sh

  # config_s3.sh
  cat > /usr/local/bin/config_s3.sh << 'CONFIG_S3_EOF'
${local.config_s3_script}
CONFIG_S3_EOF
  chmod +x /usr/local/bin/config_s3.sh


  apt-get update && apt-get install -y
  
  # Install google cli 
  if ! command -v gcloud >/dev/null 2>&1; then
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    apt-get update && apt-get install -y google-cloud-cli
  fi

  # Authenticate with gcloud using instance service account
  gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true
  gcloud config set account $(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email" -H "Metadata-Flavor: Google")
  gcloud config set project $(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")
  
  export HOME="/root"
  
  # Install OpenVidu
  /usr/local/bin/install.sh || { echo "[OpenVidu] error installing OpenVidu"; exit 1; }
  
  # Config S3 bucket
  /usr/local/bin/config_s3.sh || { echo "[OpenVidu] error configuring S3 bucket"; exit 1; }
  
  # Start OpenVidu
  systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; exit 1; }
  
  # Update shared secret
  /usr/local/bin/after_install.sh || { echo "[OpenVidu] error updating shared secret"; exit 1; }

  # restart.sh
  echo "@reboot /usr/local/bin/restart.sh >> /var/log/openvidu-restart.log" 2>&1 | crontab
  
  # Mark installation as complete
  echo "installation_complete" > /usr/local/bin/openvidu_install_counter.txt
fi

# Wait for the app
/usr/local/bin/check_app_ready.sh
EOF

  install_script_media = <<-EOF
#!/bin/bash -x
set -e

# Install dependencies
apt-get update && apt-get install -y \
  curl \
  unzip \
  jq \
  wget \
  ca-certificates \
  gnupg \
  lsb-release \
  openssl

# Configure gcloud with instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true

METADATA_URL="http://metadata.google.internal/computeMetadata/v1"
get_meta() { curl -s -H "Metadata-Flavor: Google" "$${METADATA_URL}/$1"; }

# Get metadata
MASTER_NODE_PRIVATE_IP=$(get_meta "instance/attributes/masterNodePrivateIP")
STACK_NAME=$(get_meta "instance/attributes/stackName")
PRIVATE_IP=$(get_meta "instance/network-interfaces/0/ip")

# Wait for master node to be ready by checking secrets
while ! gcloud secrets versions access latest --secret=ALL_SECRETS_GENERATED 2>/dev/null; do
  echo "Waiting for master node to initialize secrets..."
  sleep 10
done

# Get all necessary values from secrets
DOMAIN=$(gcloud secrets versions access latest --secret=DOMAIN_NAME)
OPENVIDU_PRO_LICENSE=$(gcloud secrets versions access latest --secret=OPENVIDU_PRO_LICENSE)
REDIS_PASSWORD=$(gcloud secrets versions access latest --secret=REDIS_PASSWORD)

# Get OpenVidu version from secret
OPENVIDU_VERSION=$(gcloud secrets versions access latest --secret=OPENVIDU_VERSION)

if [[ "$OPENVIDU_VERSION" == "none" ]]; then
  echo "OpenVidu version not found"
  exit 1
fi

# Build install command for media node
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/elastic/$OPENVIDU_VERSION/install_ov_media_node.sh)"

# Media node arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=gcp"
  "--deployment-type=elastic"
  "--node-role=media-node"
  "--master-node-private-ip=$MASTER_NODE_PRIVATE_IP"
  "--private-ip=$PRIVATE_IP"
  "--redis-password=$REDIS_PASSWORD"
)

# Construct the final command
FINAL_COMMAND="$INSTALL_COMMAND $(printf "%s " "$${COMMON_ARGS[@]}")"

# Execute installation
exec bash -c "$FINAL_COMMAND"
EOF

  graceful_shutdown_script = <<-EOF
#!/bin/bash -x
set -e

# This script handles graceful shutdown of media nodes (similar to AWS/Azure approach)
echo "Starting graceful shutdown of OpenVidu Media Node..."

# Check if docker is installed and OpenVidu services are running
if [ -x "$$(command -v docker)" ]; then
  echo "Stopping media node services and waiting for termination..."
  
  # Send SIGQUIT signal to allow graceful shutdown (same as AWS/Azure)
  docker container kill --signal=SIGQUIT openvidu || true
  docker container kill --signal=SIGQUIT ingress || true  
  docker container kill --signal=SIGQUIT egress || true
  
  # Stop all openvidu agent containers
  for agent_container in $$(docker ps --filter "label=openvidu-agent=true" --format '{{.Names}}'); do
    docker container kill --signal=SIGQUIT "$$agent_container" || true
  done
  
  # Wait for containers to stop gracefully (similar to AWS timeout logic)
  TIME_PASSED=0
  TIMEOUT_MAX=300  # 5 minutes timeout (shorter than AWS since no lifecycle hook extension)
  
  echo "Waiting for containers to stop gracefully..."
  while [ $$(docker ps --filter "label=openvidu-agent=true" -q | wc -l) -gt 0 ] || \
        [ $$(docker inspect -f '{{.State.Running}}' openvidu 2>/dev/null) == "true" ] || \
        [ $$(docker inspect -f '{{.State.Running}}' ingress 2>/dev/null) == "true" ] || \
        [ $$(docker inspect -f '{{.State.Running}}' egress 2>/dev/null) == "true" ]; do
    echo "Waiting for containers to stop... ($${TIME_PASSED}s elapsed)"
    sleep 5
    TIME_PASSED=$$((TIME_PASSED+5))
    
    if [ $$TIME_PASSED -ge $$TIMEOUT_MAX ]; then
      echo "Timeout reached. Forcing container shutdown."
      break
    fi
  done
  
  echo "All OpenVidu containers have been stopped."
else
  echo "Docker not found, stopping OpenVidu service directly..."
  if systemctl is-active --quiet openvidu; then
    systemctl stop openvidu
  fi
fi

echo "Graceful shutdown completed."
EOF

  user_data_media = <<-EOF
#!/bin/bash -x
set -eu -o pipefail

# restart.sh
cat > /usr/local/bin/restart.sh << 'RESTART_EOF'
${local.restart_script}
RESTART_EOF
chmod +x /usr/local/bin/restart.sh

# graceful_shutdown.sh
cat > /usr/local/bin/graceful_shutdown.sh << 'SHUTDOWN_EOF'
${local.graceful_shutdown_script}
SHUTDOWN_EOF
chmod +x /usr/local/bin/graceful_shutdown.sh

# Check if installation already completed
if [ -f /usr/local/bin/openvidu_install_counter.txt ]; then
  # Launch on reboot
  /usr/local/bin/restart.sh || { echo "[OpenVidu] error restarting OpenVidu"; exit 1; }
else
  # install.sh (media node)
  cat > /usr/local/bin/install.sh << 'INSTALL_EOF'
${local.install_script_media}
INSTALL_EOF
  chmod +x /usr/local/bin/install.sh

  # store_secret.sh
  cat > /usr/local/bin/store_secret.sh << 'STORE_SECRET_EOF'
${local.store_secret_script}
STORE_SECRET_EOF
  chmod +x /usr/local/bin/store_secret.sh

  # check_app_ready.sh
  cat > /usr/local/bin/check_app_ready.sh << 'CHECK_APP_EOF'
${local.check_app_ready_script}
CHECK_APP_EOF
  chmod +x /usr/local/bin/check_app_ready.sh

  apt-get update && apt-get install -y
  
  # Install google cli 
  if ! command -v gcloud >/dev/null 2>&1; then
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    apt-get update && apt-get install -y google-cloud-cli
  fi

  # Authenticate with gcloud using instance service account
  gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true
  gcloud config set account $(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email" -H "Metadata-Flavor: Google")
  gcloud config set project $(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")
  
  export HOME="/root"
  
  # Install OpenVidu Media Node
  /usr/local/bin/install.sh || { echo "[OpenVidu] error installing OpenVidu Media Node"; exit 1; }
  
  # Start OpenVidu
  systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; exit 1; }

  # Set up graceful shutdown service
  cat > /etc/systemd/system/openvidu-graceful-shutdown.service << 'SERVICE_EOF'
[Unit]
Description=OpenVidu Media Node Graceful Shutdown
DefaultDependencies=false
Before=shutdown.target reboot.target halt.target

[Service]
Type=oneshot
RemainAfterExit=true
ExecStart=/bin/true
ExecStop=/usr/local/bin/graceful_shutdown.sh
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
SERVICE_EOF

  systemctl daemon-reload
  systemctl enable openvidu-graceful-shutdown.service
  systemctl start openvidu-graceful-shutdown.service

  # Set up preemption monitoring
  cat > /etc/systemd/system/preemption-monitor.service << 'PREEMPT_EOF'
[Unit]
Description=GCP Preemption Monitor
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=5
ExecStart=/bin/bash -c 'while true; do if curl -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/preempted" 2>/dev/null | grep -q "TRUE"; then /usr/local/bin/graceful_shutdown.sh; break; fi; sleep 5; done'

[Install]
WantedBy=multi-user.target
PREEMPT_EOF

  systemctl daemon-reload
  systemctl enable preemption-monitor.service
  systemctl start preemption-monitor.service

  # restart.sh
  echo "@reboot /usr/local/bin/restart.sh >> /var/log/openvidu-restart.log" 2>&1 | crontab
  
  # Mark installation as complete
  echo "installation_complete" > /usr/local/bin/openvidu_install_counter.txt
fi

# Wait for the app
/usr/local/bin/check_app_ready.sh
EOF

}
