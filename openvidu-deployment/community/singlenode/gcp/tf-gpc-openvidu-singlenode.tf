# Enable APIs the deployment needs
resource "google_project_service" "compute_api" { service = "compute.googleapis.com" }
resource "google_project_service" "secretmanager_api" { service = "secretmanager.googleapis.com" }
resource "google_project_service" "storage_api" { service = "storage.googleapis.com" }

resource "random_id" "bucket_suffix" { byte_length = 3 }

# GCS bucket (conditional)
resource "google_storage_bucket" "bucket" {
  count                       = 1
  name                        = local.isEmpty ? "openvidu-appdata" : var.bucketName
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true
}

# Secret Manager secret that stores deployment info and seed secrets
resource "google_secret_manager_secret" "openvidu_secret_manager" {
  secret_id = "openvidu-${var.region}-${var.stackName}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "openvidu_version" {
  secret = google_secret_manager_secret.openvidu.id
  secret_data = jsonencode({
    DOMAIN_NAME              = "none",
    LIVEKIT_TURN_DOMAIN_NAME = "none",
    LETSENCRYPT_EMAIL        = "none",
    REDIS_PASSWORD           = "none",
    MONGO_ADMIN_USERNAME     = "none",
    MONGO_ADMIN_PASSWORD     = "none",
    MONGO_REPLICA_SET_KEY    = "none",
    MINIO_URL                = "none",
    MINIO_ACCESS_KEY         = "none",
    MINIO_SECRET_KEY         = "none",
    DASHBOARD_URL            = "none",
    DASHBOARD_ADMIN_USERNAME = "none",
    DASHBOARD_ADMIN_PASSWORD = "none",
    GRAFANA_URL              = "none",
    GRAFANA_ADMIN_USERNAME   = "none",
    GRAFANA_ADMIN_PASSWORD   = "none",
    LIVEKIT_API_KEY          = "none",
    LIVEKIT_API_SECRET       = "none",
    MEET_ADMIN_USER          = "none",
    MEET_ADMIN_SECRET        = "none",
    MEET_API_KEY             = "none",
    ENABLED_MODULES          = "none"
  })
}

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
      image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts"
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

  metadata_startup_script = local.user_data

  labels = {
    stack = var.stackName
  }
}

# ------------------------- local values -------------------------

locals {
  isEmpty        = var.bucketName == ""
  install_script = <<-EOF
  #!/bin/bash -x
  OPENVIDU_VERSION=3.3.0 #CHANGE
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

  # Configure domain
  if [[ -z "${var.domainName}" || "${var.domainName}" == "none" ]]; then
    # Use external IP
    EXTERNAL_IP=$(curl -s ifconfig.co || true)
    DOMAIN="$$EXTERNAL_IP"
  else
    DOMAIN="${var.domainName}"
  fi
  
  DOMAIN="$(/usr/local/bin/store_secret.sh save DOMAIN_NAME "$$DOMAIN")"

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
  MEET_ADMIN_USER="$(/usr/local/bin/store_secret.sh save MEET_ADMIN_USER "meetadmin")"
  MEET_ADMIN_SECRET="$(/usr/local/bin/store_secret.sh generate MEET_ADMIN_SECRET)"
  MEET_API_KEY="$(/usr/local/bin/store_secret.sh generate MEET_API_KEY)"
  ENABLED_MODULES="$(/usr/local/bin/store_secret.sh save ENABLED_MODULES "observability,openviduMeet")"
  LIVEKIT_API_KEY="$(/usr/local/bin/store_secret.sh generate LIVEKIT_API_KEY "API" 12)"
  LIVEKIT_API_SECRET="$(/usr/local/bin/store_secret.sh generate LIVEKIT_API_SECRET)"

  # Build install command and args
  INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/community/singlenode/$$OPENVIDU_VERSION/install.sh)"
  
  # Common arguments
  COMMON_ARGS=(
    "--no-tty"
    "--install"
    "--environment=gcp"
    "--deployment-type=single_node"
    "--domain-name=$$DOMAIN"
    "--enabled-modules='$$ENABLED_MODULES'"
    "--redis-password=$$REDIS_PASSWORD"
    "--mongo-admin-user=$$MONGO_ADMIN_USERNAME"
    "--mongo-admin-password=$$MONGO_ADMIN_PASSWORD"
    "--mongo-replica-set-key=$$MONGO_REPLICA_SET_KEY"
    "--minio-access-key=$$MINIO_ACCESS_KEY"
    "--minio-secret-key=$$MINIO_SECRET_KEY"
    "--dashboard-admin-user=$$DASHBOARD_ADMIN_USERNAME"
    "--dashboard-admin-password=$$DASHBOARD_ADMIN_PASSWORD"
    "--grafana-admin-user=$$GRAFANA_ADMIN_USERNAME"
    "--grafana-admin-password=$$GRAFANA_ADMIN_PASSWORD"
    "--meet-admin-user=$$MEET_ADMIN_USER"
    "--meet-admin-password=$$MEET_ADMIN_SECRET"
    "--meet-api-key=$$MEET_API_KEY"
    "--livekit-api-key=$$LIVEKIT_API_KEY"
    "--livekit-api-secret=$$LIVEKIT_API_SECRET"
  )

  # Include additional installer flags (trimmed)
  if [[ "${var.additionalInstallFlags}" != "" ]]; then
    IFS=',' read -ra EXTRA_FLAGS <<< "${var.additionalInstallFlags}"
    for extra_flag in "$${EXTRA_FLAGS[@]}"; do
      # Trim whitespace around each flag
      extra_flag="$(echo -e "$${extra_flag}" | sed -e 's/^[ \t]*//' -e 's/[ \t]*$//')"
      if [[ "$$extra_flag" != "" ]]; then
        COMMON_ARGS+=("$$extra_flag")
      fi
    done
  fi

  # Turn with TLS
  if [[ "${var.turnDomainName}" != "" ]]; then
    LIVEKIT_TURN_DOMAIN_NAME=$(/usr/local/bin/store_secret.sh save LIVEKIT_TURN_DOMAIN_NAME "${TurnDomainName}")
    COMMON_ARGS+=(
      "--turn-domain-name=$$LIVEKIT_TURN_DOMAIN_NAME"
    )
  fi

  # Certificate arguments
  if [[ "${var.certificateType}" == "selfsigned" ]]; then
    CERT_ARGS=(
      "--certificate-type=selfsigned"
    )
  elif [[ "${var.certificateType}" == "letsencrypt" ]]; then
    LETSENCRYPT_EMAIL=$(/usr/local/bin/store_secret.sh save LETSENCRYPT_EMAIL "${var.letsEncryptEmail}")
    CERT_ARGS=(
      "--certificate-type=letsencrypt"
      "--letsencrypt-email=${var.letsEncryptEmail}"
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

  after_install_script = <<-EOF
  EOF

  update_config_from_secret_script = <<-EOF
  EOF

  update_secret_from_config_script = <<-EOF
  EOF

  get_value_from_config_script = <<-EOF
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
      gcloud secrets versions add $SECRET_KEY_NAME --data-file=<(echo -n "$RANDOM_PASSWORD") 2>/dev/null || echo "$RANDOM_PASSWORD" | gcloud secrets versions add $SECRET_KEY_NAME --data-file=-
      if [[ $? -ne 0 ]]; then
          echo "Error generating secret"
      fi
      echo "$RANDOM_PASSWORD"
  elif [[ "$MODE" == "save" ]]; then
      SECRET_KEY_NAME="$2"
      SECRET_VALUE="$3"
      gcloud secrets versions add $SECRET_KEY_NAME --data-file=<(echo -n "$SECRET_VALUE") 2>/dev/null || echo "$SECRET_VALUE" | gcloud secrets versions add $SECRET_KEY_NAME --data-file=-
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

  user_data = <<-EOF
  #!/bin/bash -x
  set -eu -o pipefail

  # install.sh
  cat > /usr/local/bin/install.sh << 'INSTALL_EOF'
  ${local.install_script}
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

  # restart.sh
  cat > /usr/local/bin/restart.sh << 'RESTART_EOF'
  ${local.restart_script}
  RESTART_EOF
  chmod +x /usr/local/bin/restart.sh

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

  export HOME="/root"

  # Install OpenVidu
  /usr/local/bin/install.sh || { echo "[OpenVidu] error installing OpenVidu"; exit 1; }

  #Config blob storage
  # /usr/local/bin/config_blobStorage.sh || { echo "[OpenVidu] error configuring Blob Storage"; exit 1; }

  # Start OpenVidu
  systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; exit 1; }

  # Update shared secret
  /usr/local/bin/after_install.sh || { echo "[OpenVidu] error updating shared secret"; exit 1; }

  # Launch on reboot
  echo "@reboot /usr/local/bin/restart.sh >> /var/log/openvidu-restart.log" 2>&1 | crontab

  # Wait for the app
  /usr/local/bin/check_app_ready.sh
  EOF

}
