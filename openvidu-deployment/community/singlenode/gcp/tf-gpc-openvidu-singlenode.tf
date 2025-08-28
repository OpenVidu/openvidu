# Enable APIs the deployment needs
resource "google_project_service" "compute_api" { service = "compute.googleapis.com" }
resource "google_project_service" "secretmanager_api" { service = "secretmanager.googleapis.com" }
resource "google_project_service" "storage_api" { service = "storage.googleapis.com" }

resource "random_id" "bucket_suffix" { byte_length = 3 }

# GCS bucket (conditional)
# resource "google_storage_bucket" "bucket" {
#   count                       = 1
#   name                        = local.isEmpty ? "openvidu-appdata" : var.bucketName
#   location                    = var.region
#   force_destroy               = false
#   uniform_bucket_level_access = true
# }

# Secret Manager secret that stores deployment info and seed secrets
# resource "google_secret_manager_secret" "openvidu" {
#   secret_id = "openvidu-${var.region}-${var.stackName}"
#   replication {
#     auto {}
#   }
# }

# resource "google_secret_manager_secret_version" "openvidu_version" {
#   secret = google_secret_manager_secret.openvidu.id
#   secret_data = jsonencode({
#     domainName               = "none",
#     LIVEKIT_turnDomainName   = "none",
#     LETSENCRYPT_EMAIL        = "none",
#     REDIS_PASSWORD           = "none",
#     MONGO_ADMIN_USERNAME     = "none",
#     MONGO_ADMIN_PASSWORD     = "none",
#     MONGO_REPLICA_SET_KEY    = "none",
#     MINIO_URL                = "none",
#     MINIO_ACCESS_KEY         = "none",
#     MINIO_SECRET_KEY         = "none",
#     DASHBOARD_URL            = "none",
#     DASHBOARD_ADMIN_USERNAME = "none",
#     DASHBOARD_ADMIN_PASSWORD = "none",
#     GRAFANA_URL              = "none",
#     GRAFANA_ADMIN_USERNAME   = "none",
#     GRAFANA_ADMIN_PASSWORD   = "none",
#     LIVEKIT_API_KEY          = "none",
#     LIVEKIT_API_SECRET       = "none",
#     MEET_ADMIN_USER          = "none",
#     MEET_ADMIN_SECRET        = "none",
#     MEET_API_KEY             = "none",
#     ENABLED_MODULES          = "none"
#   })
# }

# Service account for the instance
resource "google_service_account" "openvidu_sa" {
  account_id   = lower("openvidu-sa-${substr(var.stackName, 0, 12)}")
  display_name = "OpenVidu instance service account"
}

# IAM bindings for the service account so the instance can access Secret Manager and GCS
resource "google_project_iam_member" "sa_secret_accessor" {
  project = var.projectId
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.openvidu_sa.email}"
}

resource "google_project_iam_member" "sa_storage_object_admin" {
  project = var.projectId
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.openvidu_sa.email}"
}

# Firewall (similar ports to your AWS SG)
resource "google_compute_firewall" "openvidu_fw" {
  name    = lower("openvidu-fw-${var.stackName}")
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443", "1935", "7881"]
  }
  allow {
    protocol = "udp"
    ports    = ["443", "7885", "50000-60000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["openvidu-server-${var.stackName}"]
}

# Static external IP (optional)
resource "google_compute_address" "openvidu_ip" {
  count   = var.publicStaticIp == "" ? 0 : 1
  name    = "openvidu-eip-${var.stackName}"
  address = var.publicStaticIp
}

# Compute instance for OpenVidu
resource "google_compute_instance" "openvidu" {
  name         = "openvidu-${var.stackName}"
  machine_type = var.instanceType
  zone         = var.zone

  tags = ["openvidu-server-${var.stackName}"]

  boot_disk {
    initialize_params {
      image = var.boot_image
      size  = 200
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = length(google_compute_address.openvidu_ip) > 0 ? google_compute_address.openvidu_ip[0].address : null
    }
  }

  metadata = {
    # metadata values are accessible from the instance
    # secret_name               = google_secret_manager_secret.openvidu.secret_id
    region                    = var.region
    stackName                 = var.stackName
    certificateType           = var.certificateType
    domainName                = var.domainName
    letsEncryptEmail          = var.letsEncryptEmail
    ownPublicCertificate      = var.ownPublicCertificate
    ownPrivateCertificate     = var.ownPrivateCertificate
    additional_install_flags  = var.additional_install_flags
    turnDomainName            = var.turnDomainName
    turnOwnPublicCertificate  = var.turnOwnPublicCertificate
    turnOwnPrivateCertificate = var.turnOwnPrivateCertificate
    s3_bucket_name            = var.bucketName == "" ? "openvidu-appdata" : var.bucketName
  }

  service_account {
    email  = google_service_account.openvidu_sa.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }


  metadata_startup_script = <<EOF
  #!/bin/bash -x
  set -euo pipefail

  # Metadata helper
  METADATA_URL="http://metadata.google.internal/computeMetadata/v1"
  get_meta() { curl -s -H "Metadata-Flavor: Google" "$${METADATA_URL}/$1"; }

  projevar.projectId=$(get_meta "project/project-id")
  REGION=$(get_meta "instance/attributes/region")
  stackName=$(get_meta "instance/attributes/stackName")
  SECRET_NAME=$(get_meta "instance/attributes/secret_name")
  CERT_TYPE=$(get_meta "instance/attributes/certificateType")
  domainName=$(get_meta "instance/attributes/domainName")
  LE_EMAIL=$(get_meta "instance/attributes/letsEncryptEmail")
  ADDITIONAL_FLAGS=$(get_meta "instance/attributes/additional_install_flags")
  turnDomainName=$(get_meta "instance/attributes/turnDomainName")
  OWN_CERT_URL=$(get_meta "instance/attributes/ownPublicCertificate")
  OWN_KEY_URL=$(get_meta "instance/attributes/ownPrivateCertificate")
  S3_BUCKET_NAME=$(get_meta "instance/attributes/s3_bucket_name")

  # Install deps
  apt-get update
  apt-get install -y curl unzip jq wget ca-certificates gnupg lsb-release openssl

  # Install google-cloud-sdk (to read secrets)
  if ! command -v gcloud >/dev/null 2>&1; then
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
    apt-get update && apt-get install -y google-cloud-sdk
  fi

  # Install yq
  YQ_VERSION=v4.44.5
  wget https://github.com/mikefarah/yq/releases/download/$${YQ_VERSION}/yq_linux_amd64.tar.gz -O - | tar xz && mv yq_linux_amd64 /usr/bin/yq

  # Fetch secret (the secret contains a JSON string as in Terraform)
  SHARED_SECRET_JSON=$(gcloud secrets versions access latest --secret="$${SECRET_NAME}" --project="$${projevar.projectId}") || SHARED_SECRET_JSON='{}'

  # Helper to update secret using gcloud (we will use it to save values)
  save_secret() {
    KEY=$1
    VALUE=$2
    # read current, update key, and write a new version
    TMP=$(mktemp)
    echo "$SHARED_SECRET_JSON" | jq ". + { \"$${KEY}\": \"$${VALUE}\" }" > "$TMP" || echo '{ }' > "$TMP"
    gcloud secrets versions add "$${SECRET_NAME}" --data-file="$TMP" --project="$${projevar.projectId}" >/dev/null
    SHARED_SECRET_JSON=$(cat "$TMP")
    rm -f "$TMP"
  }

  # Generate randoms and save to secret when needed (similar to CFN store_secret.sh)
  generate_and_save() {
    KEY=$1
    PREFIX=$${2:-}
    LENGTH=$${3:-44}
    RAND=$(openssl rand -base64 64 | tr -d '+/=\n' | cut -c -$${LENGTH})
    VALUE="$${PREFIX}$${RAND}"
    save_secret "$KEY" "$VALUE"
    echo "$VALUE"
  }

  # Configure domain
  if [[ -z "$domainName" || "$domainName" == "none" ]]; then
    # Use external IP
    EXTERNAL_IP=$(curl -s ifconfig.co || true)
    DOMAIN="$EXTERNAL_IP"
  else
    DOMAIN="$domainName"
  fi
  save_secret domainName "$DOMAIN"

  # Generate/store secrets used by OpenVidu
  REDIS_PASSWORD=$(generate_and_save REDIS_PASSWORD)
  MONGO_ADMIN_USERNAME=$(save_secret MONGO_ADMIN_USERNAME "mongoadmin")
  MONGO_ADMIN_PASSWORD=$(generate_and_save MONGO_ADMIN_PASSWORD)
  MONGO_REPLICA_SET_KEY=$(generate_and_save MONGO_REPLICA_SET_KEY)
  MINIO_ACCESS_KEY=$(save_secret MINIO_ACCESS_KEY "minioadmin")
  MINIO_SECRET_KEY=$(generate_and_save MINIO_SECRET_KEY)
  DASHBOARD_ADMIN_USERNAME=$(save_secret DASHBOARD_ADMIN_USERNAME "dashboardadmin")
  DASHBOARD_ADMIN_PASSWORD=$(generate_and_save DASHBOARD_ADMIN_PASSWORD)
  GRAFANA_ADMIN_USERNAME=$(save_secret GRAFANA_ADMIN_USERNAME "grafanaadmin")
  GRAFANA_ADMIN_PASSWORD=$(generate_and_save GRAFANA_ADMIN_PASSWORD)
  MEET_ADMIN_USER=$(save_secret MEET_ADMIN_USER "meetadmin")
  MEET_ADMIN_SECRET=$(generate_and_save MEET_ADMIN_SECRET)
  MEET_API_KEY=$(generate_and_save MEET_API_KEY)
  ENABLED_MODULES=$(save_secret ENABLED_MODULES "observability,openviduMeet")
  LIVEKIT_API_KEY=$(generate_and_save LIVEKIT_API_KEY "API" 12)
  LIVEKIT_API_SECRET=$(generate_and_save LIVEKIT_API_SECRET)

  # Build install command and args
  INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/community/singlenode/main/install.sh)"
  COMMON_ARGS=(
    "--no-tty"
    "--install"
    "--environment=gcp"
    "--deployment-type=single_node"
    "--domain-name=$DOMAIN"
    "--enabled-modules='$ENABLED_MODULES'"
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

  # Include additional installer flags (trimmed)
  if [[ -n "$ADDITIONAL_FLAGS" && "$ADDITIONAL_FLAGS" != "none" ]]; then
    IFS=',' read -ra EXTRA_FLAGS <<< "$ADDITIONAL_FLAGS"
    for extra_flag in "$${EXTRA_FLAGS[@]}"; do
      extra_flag="$(echo -e "$extra_flag" | sed -e 's/^\s*//' -e 's/\s*$//')"
      if [[ -n "$extra_flag" ]]; then
        COMMON_ARGS+=("$extra_flag")
      fi
    done
  fi

  # TURN domain
  if [[ -n "$turnDomainName" && "$turnDomainName" != "none" ]]; then
    save_secret LIVEKIT_turnDomainName "$turnDomainName"
    COMMON_ARGS+=("--turn-domain-name=$turnDomainName")
  fi

  # Certificate handling
  if [[ "$CERT_TYPE" == "selfsigned" ]] ; then
    CERT_ARGS=("--certificate-type=selfsigned")
  elif [[ "$CERT_TYPE" == "letsencrypt" ]] ; then
    save_secret LETSENCRYPT_EMAIL "$LE_EMAIL"
    CERT_ARGS=("--certificate-type=letsencrypt" "--letsencrypt-email=$LE_EMAIL")
  else
    # owncert: download from provided URLs and convert to base64
    mkdir -p /tmp/owncert
    if [[ -n "$OWN_CERT_URL" && -n "$OWN_KEY_URL" ]]; then
      wget -O /tmp/owncert/fullchain.pem "$OWN_CERT_URL"
      wget -O /tmp/owncert/privkey.pem   "$OWN_KEY_URL"
      OWN_CERT_CRT=$(base64 -w 0 /tmp/owncert/fullchain.pem)
      OWN_CERT_KEY=$(base64 -w 0 /tmp/owncert/privkey.pem)
      CERT_ARGS=("--certificate-type=owncert" "--owncert-public-key=$OWN_CERT_CRT" "--owncert-private-key=$OWN_CERT_KEY")
    else
      echo "owncert selected but cert URLs not provided"
      exit 1
    fi
  fi

  # Final command
  FINAL_COMMAND="$INSTALL_COMMAND $(printf "%s " "$${COMMON_ARGS[@]}") $(printf "%s " "$${CERT_ARGS[@]}")"

  # Execute installation
  bash -c "$FINAL_COMMAND"

  # Configure GCS bucket in OpenVidu config if needed
  if [[ -n "$S3_BUCKET_NAME" && "$S3_BUCKET_NAME" != "none" ]]; then
    # Wait for openvidu config dir
    CONFIG_DIR="/opt/openvidu/config"
    if [[ -f "$${CONFIG_DIR}/openvidu.env" ]]; then
      sed -i "s|EXTERNAL_S3_BUCKET_APP_DATA=.*|EXTERNAL_S3_BUCKET_APP_DATA=$${S3_BUCKET_NAME}|" "$${CONFIG_DIR}/openvidu.env" || true
    fi
  fi
  EOF

  labels = {
    stack = var.stackName
  }
}

# ------------------------- local values -------------------------

locals {
  isEmpty = var.bucketName == ""
}
