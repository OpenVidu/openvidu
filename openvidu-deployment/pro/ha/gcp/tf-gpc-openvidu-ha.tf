# Enable APIs the deployment needs
resource "google_project_service" "compute_api" { service = "compute.googleapis.com" }
resource "google_project_service" "secretmanager_api" { service = "secretmanager.googleapis.com" }
resource "google_project_service" "storage_api" { service = "storage.googleapis.com" }
resource "google_project_service" "iam_api" { service = "iam.googleapis.com" }
resource "google_project_service" "cloudresourcemanager_api" { service = "cloudresourcemanager.googleapis.com" }
resource "google_project_service" "cloudfunctions_api" { service = "cloudfunctions.googleapis.com" }
resource "google_project_service" "cloudscheduler_api" { service = "cloudscheduler.googleapis.com" }
resource "google_project_service" "cloudbuild_api" { service = "cloudbuild.googleapis.com" }
resource "google_project_service" "run_api" { service = "run.googleapis.com" }

resource "random_id" "bucket_suffix" { byte_length = 3 }

# Secret Manager secrets for OpenVidu HA deployment information
resource "google_secret_manager_secret" "openvidu_shared_info" {
  for_each = toset([
    "OPENVIDU_URL", "MEET_INITIAL_ADMIN_USER", "MEET_INITIAL_ADMIN_PASSWORD",
    "MEET_INITIAL_API_KEY", "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
    "DASHBOARD_URL", "GRAFANA_URL", "MINIO_URL", "DOMAIN_NAME",
    "OPENVIDU_PRO_LICENSE", "OPENVIDU_RTC_ENGINE", "REDIS_PASSWORD", "MONGO_ADMIN_USERNAME",
    "MONGO_ADMIN_PASSWORD", "MONGO_REPLICA_SET_KEY", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY",
    "DASHBOARD_ADMIN_USERNAME", "DASHBOARD_ADMIN_PASSWORD", "GRAFANA_ADMIN_USERNAME",
    "GRAFANA_ADMIN_PASSWORD", "ENABLED_MODULES", "OPENVIDU_VERSION", "ALL_SECRETS_GENERATED",
    "MASTER_NODE_1_PRIVATE_IP", "MASTER_NODE_2_PRIVATE_IP", "MASTER_NODE_3_PRIVATE_IP", "MASTER_NODE_4_PRIVATE_IP"
  ])

  secret_id = each.key
  replication {
    auto {}
  }
}

# GCS buckets for HA deployment
resource "google_storage_bucket" "appdata_bucket" {
  count                       = local.isEmptyAppData ? 1 : 0
  name                        = "${var.projectId}-${var.stackName}-appdata-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "clusterdata_bucket" {
  count                       = local.isEmptyClusterData ? 1 : 0
  name                        = "${var.projectId}-${var.stackName}-clusterdata-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

# Service account for the instances
resource "google_service_account" "service_account" {
  account_id   = lower("${substr(var.stackName, 0, 12)}-sa")
  display_name = "OpenVidu instance service account"
}

# IAM bindings for the service account
resource "google_project_iam_member" "iam_project_role" {
  project = var.projectId
  role    = "roles/owner"
  member  = "serviceAccount:${google_service_account.service_account.email}"
}

# External SSH access to Master Nodes
resource "google_compute_firewall" "external_master_ssh" {
  name    = lower("${var.stackName}-external-master-ssh")
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = [lower("${var.stackName}-master-node")]
}

# External access to Media Nodes (SSH and media traffic)
resource "google_compute_firewall" "external_media_access" {
  name    = lower("${var.stackName}-external-media-access")
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "7881", "50000-60000"]
  }
  allow {
    protocol = "udp"
    ports    = ["443", "7885", "50000-60000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = [lower("${var.stackName}-media-node")]
}

# Load Balancer health checks and HTTP traffic to Master Nodes
resource "google_compute_firewall" "lb_to_master_http" {
  name    = lower("${var.stackName}-lb-to-master-http")
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80", "7880", "1945", "5349", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = [lower("${var.stackName}-master-node")]
}

# Master node internal services communication
resource "google_compute_firewall" "master_to_master_internal" {
  name    = lower("${var.stackName}-master-to-master-internal")
  network = "default"

  allow {
    protocol = "tcp"
    ports = [
      "7000", "7001",
      "9100", "9101",
      "20000",
      "9095", "7946",
      "9096", "7947",
      "5000",
      "3000",
      "4443",
      "9080"
    ]
  }

  source_tags = [lower("${var.stackName}-master-node")]
  target_tags = [lower("${var.stackName}-master-node")]
}

# Media Nodes to Master Nodes communication
resource "google_compute_firewall" "media_to_master_services" {
  name    = lower("${var.stackName}-media-to-master-services")
  network = "default"

  allow {
    protocol = "tcp"
    ports = [
      "7000", "7001",
      "7880",
      "9100",
      "20000",
      "9009",
      "3100",
      "4443",
      "9080"
    ]
  }

  source_tags = [lower("${var.stackName}-media-node")]
  target_tags = [lower("${var.stackName}-master-node")]
}

# Master Nodes to Media Nodes communication
resource "google_compute_firewall" "master_to_media_services" {
  name    = lower("${var.stackName}-master-to-media-services")
  network = "default"

  allow {
    protocol = "tcp"
    ports = [
      "1935",
      "5349",
      "7880", "8080"
    ]
  }

  source_tags = [lower("${var.stackName}-master-node")]
  target_tags = [lower("${var.stackName}-media-node")]
}


# Regional static IP for the Network Load Balancer (conditional creation)
resource "google_compute_address" "nlb_ip" {
  count  = var.publicIpAddress == "" ? 1 : 0
  name   = lower("${var.stackName}-nlb-ip")
  region = var.region
}

# Data source for existing IP address when publicIpAddress is provided
data "google_compute_address" "existing_nlb_ip" {
  count  = var.publicIpAddress != "" ? 1 : 0
  name   = var.publicIpAddress
  region = var.region
}

# Local value to get the correct IP address
locals {
  nlb_ip_address = var.publicIpAddress != "" ? data.google_compute_address.existing_nlb_ip[0].address : google_compute_address.nlb_ip[0].address
}

# Health check for backend instances
resource "google_compute_region_health_check" "tcp_health_check" {
  name   = lower("${var.stackName}-tcp-health-check")
  region = var.region

  tcp_health_check {
    port = 7880
  }

  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 3
  unhealthy_threshold = 4
}

# Regional backend service for the TCP NLB
resource "google_compute_region_backend_service" "tcp_backend" {
  name                  = lower("${var.stackName}-tcp-backend")
  region                = var.region
  protocol              = "TCP"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30
  health_checks         = [google_compute_region_health_check.tcp_health_check.id]

  backend {
    group          = google_compute_instance_group.master_node_group.id
    balancing_mode = "CONNECTION"
  }
}

# Forwarding rule for TCP 443
resource "google_compute_forwarding_rule" "tcp_443" {
  name                  = lower("${var.stackName}-tcp-443-rule")
  region                = var.region
  load_balancing_scheme = "EXTERNAL"
  backend_service       = google_compute_region_backend_service.tcp_backend.id
  port_range            = "443"
  ip_protocol           = "TCP"
  ip_address            = local.nlb_ip_address
}

# Forwarding rule for TCP 80
resource "google_compute_forwarding_rule" "tcp_80" {
  name                  = lower("${var.stackName}-tcp-80-rule")
  region                = var.region
  load_balancing_scheme = "EXTERNAL"
  backend_service       = google_compute_region_backend_service.tcp_backend.id
  port_range            = "80"
  ip_protocol           = "TCP"
  ip_address            = local.nlb_ip_address
}

# Forwarding rule for TCP 1935
resource "google_compute_forwarding_rule" "tcp_1935" {
  name                  = lower("${var.stackName}-tcp-1935-rule")
  region                = var.region
  load_balancing_scheme = "EXTERNAL"
  backend_service       = google_compute_region_backend_service.tcp_backend.id
  port_range            = "1935"
  ip_protocol           = "TCP"
  ip_address            = local.nlb_ip_address
}


# Unmanaged instance group for master nodes
resource "google_compute_instance_group" "master_node_group" {
  name        = lower("${var.stackName}-master-node-group")
  description = "Instance group for OpenVidu master nodes"
  zone        = var.zone

  instances = [
    google_compute_instance.openvidu_master_node_1.id,
    google_compute_instance.openvidu_master_node_2.id,
    google_compute_instance.openvidu_master_node_3.id,
    google_compute_instance.openvidu_master_node_4.id,
  ]

  named_port {
    name = "http"
    port = 7880
  }

  named_port {
    name = "https"
    port = 443
  }
}

locals {
  is_arm_instance = startswith(var.masterNodesInstanceType, "c4a-") || startswith(var.masterNodesInstanceType, "t2a-") || startswith(var.masterNodesInstanceType, "n4a-") || startswith(var.masterNodesInstanceType, "a4x-")
  yq_arch         = local.is_arm_instance ? "arm64" : "amd64"

  ubuntu_image    = local.is_arm_instance ? "ubuntu-os-cloud/ubuntu-2404-noble-arm64-v20241219" : "ubuntu-os-cloud/ubuntu-2404-noble-amd64-v20241219"
  is_c4a_instance = startswith(var.masterNodesInstanceType, "c4a-")
}

# Master Node 1
resource "google_compute_instance" "openvidu_master_node_1" {
  name         = lower("${var.stackName}-master-node-1")
  machine_type = var.masterNodesInstanceType
  zone         = var.zone
  tags         = [lower("${var.stackName}-master-node")]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = var.masterNodesDiskSize
      type  = local.is_c4a_instance ? "hyperdisk-balanced" : "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    stackName                = var.stackName
    masterNodeNum            = "1"
    domainName               = var.domainName
    certificateType          = var.certificateType
    ownPublicCertificate     = var.ownPublicCertificate
    ownPrivateCertificate    = var.ownPrivateCertificate
    openviduLicense          = var.openviduLicense
    rtcEngine                = var.rtcEngine
    initialMeetAdminPassword = var.initialMeetAdminPassword
    initialMeetApiKey        = var.initialMeetApiKey
    additionalInstallFlags   = var.additionalInstallFlags
    bucketAppDataName        = local.isEmptyAppData ? google_storage_bucket.appdata_bucket[0].name : var.GCSAppDataBucketName
    bucketClusterDataName    = local.isEmptyClusterData ? google_storage_bucket.clusterdata_bucket[0].name : var.GCSClusterDataBucketName
  }

  service_account {
    email  = google_service_account.service_account.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata_startup_script = local.user_data_master

  labels = {
    stack     = var.stackName
    node-type = "master"
    node-num  = "1"
  }
}

# Master Node 2
resource "google_compute_instance" "openvidu_master_node_2" {
  name         = lower("${var.stackName}-master-node-2")
  machine_type = var.masterNodesInstanceType
  zone         = var.zone
  tags         = [lower("${var.stackName}-master-node")]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = var.masterNodesDiskSize
      type  = local.is_c4a_instance ? "hyperdisk-balanced" : "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    stackName                = var.stackName
    masterNodeNum            = "2"
    domainName               = var.domainName
    certificateType          = var.certificateType
    ownPublicCertificate     = var.ownPublicCertificate
    ownPrivateCertificate    = var.ownPrivateCertificate
    openviduLicense          = var.openviduLicense
    rtcEngine                = var.rtcEngine
    initialMeetAdminPassword = var.initialMeetAdminPassword
    initialMeetApiKey        = var.initialMeetApiKey
    additionalInstallFlags   = var.additionalInstallFlags
    bucketAppDataName        = local.isEmptyAppData ? google_storage_bucket.appdata_bucket[0].name : var.GCSAppDataBucketName
    bucketClusterDataName    = local.isEmptyClusterData ? google_storage_bucket.clusterdata_bucket[0].name : var.GCSClusterDataBucketName
  }

  service_account {
    email  = google_service_account.service_account.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata_startup_script = local.user_data_master

  labels = {
    stack     = var.stackName
    node-type = "master"
    node-num  = "2"
  }

  depends_on = [google_compute_instance.openvidu_master_node_1]
}

# Master Node 3
resource "google_compute_instance" "openvidu_master_node_3" {
  name         = lower("${var.stackName}-master-node-3")
  machine_type = var.masterNodesInstanceType
  zone         = var.zone
  tags         = [lower("${var.stackName}-master-node")]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = var.masterNodesDiskSize
      type  = local.is_c4a_instance ? "hyperdisk-balanced" : "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    stackName                = var.stackName
    masterNodeNum            = "3"
    domainName               = var.domainName
    certificateType          = var.certificateType
    ownPublicCertificate     = var.ownPublicCertificate
    ownPrivateCertificate    = var.ownPrivateCertificate
    openviduLicense          = var.openviduLicense
    rtcEngine                = var.rtcEngine
    initialMeetAdminPassword = var.initialMeetAdminPassword
    initialMeetApiKey        = var.initialMeetApiKey
    additionalInstallFlags   = var.additionalInstallFlags
    bucketAppDataName        = local.isEmptyAppData ? google_storage_bucket.appdata_bucket[0].name : var.GCSAppDataBucketName
    bucketClusterDataName    = local.isEmptyClusterData ? google_storage_bucket.clusterdata_bucket[0].name : var.GCSClusterDataBucketName
  }

  service_account {
    email  = google_service_account.service_account.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata_startup_script = local.user_data_master

  labels = {
    stack     = var.stackName
    node-type = "master"
    node-num  = "3"
  }

  depends_on = [google_compute_instance.openvidu_master_node_2]
}

# Master Node 4
resource "google_compute_instance" "openvidu_master_node_4" {
  name         = lower("${var.stackName}-master-node-4")
  machine_type = var.masterNodesInstanceType
  zone         = var.zone
  tags         = [lower("${var.stackName}-master-node")]

  boot_disk {
    initialize_params {
      image = local.ubuntu_image
      size  = var.masterNodesDiskSize
      type  = local.is_c4a_instance ? "hyperdisk-balanced" : "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    stackName                = var.stackName
    masterNodeNum            = "4"
    domainName               = var.domainName
    certificateType          = var.certificateType
    ownPublicCertificate     = var.ownPublicCertificate
    ownPrivateCertificate    = var.ownPrivateCertificate
    openviduLicense          = var.openviduLicense
    rtcEngine                = var.rtcEngine
    initialMeetAdminPassword = var.initialMeetAdminPassword
    initialMeetApiKey        = var.initialMeetApiKey
    additionalInstallFlags   = var.additionalInstallFlags
    bucketAppDataName        = local.isEmptyAppData ? google_storage_bucket.appdata_bucket[0].name : var.GCSAppDataBucketName
    bucketClusterDataName    = local.isEmptyClusterData ? google_storage_bucket.clusterdata_bucket[0].name : var.GCSClusterDataBucketName
  }

  service_account {
    email  = google_service_account.service_account.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata_startup_script = local.user_data_master

  labels = {
    stack     = var.stackName
    node-type = "master"
    node-num  = "4"
  }

  depends_on = [google_compute_instance.openvidu_master_node_3]
}

# ------------------------- scale in resources -------------------------

# Create the function source code
data "archive_file" "function_source" {
  type        = "zip"
  output_path = "/tmp/function-source.zip"
  source {
    content  = local.scalein_function_code
    filename = "main.py"
  }
  source {
    content  = local.function_requirements
    filename = "requirements.txt"
  }
}

# Local values for the function source code
locals {
  scalein_function_code = <<EOF
import functions_framework
from google.cloud import compute_v1
import json
import time
import os
import logging
import subprocess
import requests
import google.auth
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from google.auth.transport.requests import Request

# Configure logging for Cloud Run
logging.basicConfig(
  level=logging.INFO,
  format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@functions_framework.http
def scalein_function(request):
  """
  Cloud Function to handle scale-in operations for media node instances.
  Abandons oldest instances when autoscaler recommends fewer instances.
  """
  print("Starting scale-in function")  # Also use print for Cloud Run logs
  logger.info("Starting scale-in function")
  
  try:
    # Parse and validate input
    project_id, region, stack_name = _parse_and_validate_request(request)
    print(f"Processing request for project: {project_id}, region: {region}, stack: {stack_name}")
    
    # Initialize GCP clients
    clients = _initialize_gcp_clients()
    
    # Construct resource names
    mig_name = f"{stack_name.lower()}-media-node-group"
    autoscaler_name = f"{stack_name.lower()}-media-node-autoscaler"
    
    print(f"Checking MIG: {mig_name} and autoscaler: {autoscaler_name}")
    logger.info(f"Checking MIG: {mig_name} and autoscaler: {autoscaler_name}")
    
    # Get current state and recommendations
    current_size, recommended_size = _get_scaling_info(
      clients, project_id, region, mig_name, autoscaler_name
    )
    
    print(f"Current size: {current_size}, Recommended size: {recommended_size}")
    logger.info(f"Current size: {current_size}, Recommended size: {recommended_size}")
    
    # Check if scale-in is needed
    if recommended_size >= current_size:
      message = "No scale-in operation needed"
      print(message)
      logger.info(message)
      return {
        "message": message, 
        "current_size": current_size, 
        "recommended_size": recommended_size
      }
    
    # Perform scale-in
    instances_to_abandon = current_size - recommended_size
    print(f"Scale-in needed: abandoning {instances_to_abandon} instances")
    
    result = _perform_scalein(
      clients, project_id, region, mig_name, instances_to_abandon
    )
    
    success_message = f"Successfully abandoned {result['abandoned_count']} instances"
    print(success_message)
    logger.info(success_message)
    
    return {
      "message": success_message,
      "abandoned_instances": result['abandoned_instances'],
      "operation_name": result['operation_name']
    }
    
  except ValueError as e:
    error_msg = f"Validation error: {str(e)}"
    print(error_msg)
    logger.error(error_msg)
    return {"error": str(e)}, 400
  except Exception as e:
    error_msg = f"Unexpected error in scaling function: {str(e)}"
    print(error_msg)
    logger.error(error_msg)
    return {"error": f"Internal server error: {str(e)}"}, 500


def _parse_and_validate_request(request) -> Tuple[str, str, str]:
  """Parse and validate the incoming request."""
  print("Parsing request...")
  request_json = request.get_json()
  if not request_json:
    raise ValueError("Request body must be valid JSON")
  
  project_id = request_json.get('project_id')
  region = request_json.get('region')
  stack_name = request_json.get('stack_name')
  
  if not all([project_id, region, stack_name]):
    raise ValueError("Missing required parameters: project_id, region, stack_name")
  
  print(f"Request parsed successfully: {project_id}, {region}, {stack_name}")
  return project_id, region, stack_name


def _initialize_gcp_clients() -> Dict:
  """Initialize all required GCP clients."""
  print("Initializing GCP clients...")
  clients = {
    'mig': compute_v1.RegionInstanceGroupManagersClient(),
    'autoscaler': compute_v1.RegionAutoscalersClient()
  }
  print("GCP clients initialized successfully")
  return clients


def _get_scaling_info(clients: Dict, project_id: str, region: str, 
           mig_name: str, autoscaler_name: str) -> Tuple[int, int]:
  """Get current MIG size and autoscaler recommendation."""
  print(f"Getting scaling info for MIG: {mig_name}")
  try:
    # Get current MIG state
    mig_request = compute_v1.GetRegionInstanceGroupManagerRequest(
      project=project_id,
      region=region,
      instance_group_manager=mig_name
    )
    mig = clients['mig'].get(request=mig_request)
    current_size = mig.target_size
    
    # Get autoscaler recommendation
    autoscaler_request = compute_v1.GetRegionAutoscalerRequest(
      project=project_id,
      region=region,
      autoscaler=autoscaler_name
    )
    autoscaler = clients['autoscaler'].get(request=autoscaler_request)
    recommended_size = autoscaler.recommended_size
    
    print(f"Retrieved scaling info - Current: {current_size}, Recommended: {recommended_size}")
    return current_size, recommended_size
    
  except Exception as e:
    error_msg = f"Failed to get scaling information: {str(e)}"
    print(error_msg)
    raise Exception(error_msg)


def _perform_scalein(clients: Dict, project_id: str, region: str, 
               mig_name: str, instances_count: int) -> Dict:
  """Perform scale-in by abandoning oldest instances."""
  print(f"Starting scale-in for {instances_count} instances")
  
  # Get instances to abandon
  instances_to_abandon = _get_oldest_instances(
    clients['mig'], project_id, region, mig_name, instances_count
  )
  
  if not instances_to_abandon:
    print("No instances to abandon")
    return {"abandoned_count": 0, "abandoned_instances": [], "operation_name": None}
  
  print(f"Preparing to abandon {len(instances_to_abandon)} instances")
  logger.info(f"Preparing to abandon {len(instances_to_abandon)} instances")
  
  # Abandon instances
  operation = _abandon_instances(clients['mig'], project_id, region, mig_name, instances_to_abandon)
  
  print(f"Instances abandoned successfully, operation: {operation.name}")
  return {
    "abandoned_count": len(instances_to_abandon),
    "abandoned_instances": instances_to_abandon,
    "operation_name": operation.name
  }


def _get_oldest_instances(mig_client, project_id: str, region: str, 
       mig_name: str, count: int) -> List[str]:
  """Get the oldest instances from the MIG."""
  print(f"Getting {count} oldest instances from MIG")
  try:
    list_request = compute_v1.ListManagedInstancesRegionInstanceGroupManagersRequest(
      project=project_id,
      region=region,
      instance_group_manager=mig_name
    )
    instances = list(mig_client.list_managed_instances(request=list_request))
    
    print(f"Found {len(instances)} total instances in MIG")
    
    # Sort by creation timestamp (oldest first) - reverse the sort order
    instances.sort(key=lambda x: _parse_timestamp(
      x.instance_status.time_created if x.instance_status and 
      hasattr(x.instance_status, 'time_created') else None
    ), reverse=True)
    
    # Select instances to abandon
    instances_to_abandon = []
    for i in range(min(count, len(instances))):
      instance = instances[i]
      if instance.instance:
        instances_to_abandon.append(instance.instance)
    
    print(f"Selected {len(instances_to_abandon)} instances to abandon")
    return instances_to_abandon
    
  except Exception as e:
    error_msg = f"Error getting oldest instances: {str(e)}"
    print(error_msg)
    logger.error(error_msg)
    return []

def _parse_timestamp(timestamp_str: Optional[str]) -> datetime:
  """Parse timestamp string to datetime object."""
  if not timestamp_str:
    return datetime.min
  try:
    return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
  except Exception:
    return datetime.min

def _abandon_instances(mig_client, project_id: str, region: str, 
            mig_name: str, instance_urls: List[str]):
  """Abandon instances from the MIG."""
  print(f"Abandoning {len(instance_urls)} instances from MIG")
  abandon_request = compute_v1.AbandonInstancesRegionInstanceGroupManagerRequest(
    project=project_id,
    region=region,
    instance_group_manager=mig_name,
    region_instance_group_managers_abandon_instances_request_resource=compute_v1.RegionInstanceGroupManagersAbandonInstancesRequest(
      instances=instance_urls
    )
  )
  
  operation = mig_client.abandon_instances(request=abandon_request)
  print(f"Abandon operation initiated: {operation.name}")
  return operation
EOF

  function_requirements = <<EOF
functions-framework==3.*
google-cloud-compute==1.*
requests==2.*
google-auth==2.*
EOF
}

resource "google_storage_bucket_object" "function_source" {
  name   = "function-source.zip"
  bucket = local.isEmptyClusterData ? google_storage_bucket.clusterdata_bucket[0].name : var.GCSClusterDataBucketName
  source = data.archive_file.function_source.output_path
}

resource "google_cloudfunctions2_function" "scalein_function" {
  name        = lower("${var.stackName}-scalein-function")
  location    = var.region
  description = "Function to handle scale in operations"

  build_config {
    runtime     = "python311"
    entry_point = "scalein_function"
    source {
      storage_source {
        bucket = local.isEmptyClusterData ? google_storage_bucket.clusterdata_bucket[0].name : var.GCSClusterDataBucketName
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "512M"
    timeout_seconds    = 300
    environment_variables = {
      PROJECT_ID = var.projectId
      REGION     = var.region
      STACK_NAME = var.stackName
    }
    service_account_email = google_service_account.service_account.email
  }
}

# Cloud Scheduler to trigger the function every 5 minutes
resource "google_cloud_scheduler_job" "scale_scheduler" {
  name             = lower("${var.stackName}-scale-scheduler")
  description      = "Trigger scaling function every 5 minutes"
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "300s"

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.scalein_function.service_config[0].uri

    # Send JSON payload with inputs
    body = base64encode(jsonencode({
      project_id = var.projectId
      region     = var.region
      stack_name = var.stackName
    }))

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.service_account.email
    }
  }
}

locals {
  is_arm_media_instance = startswith(var.mediaNodeInstanceType, "c4a-") || startswith(var.mediaNodeInstanceType, "t2a-") || startswith(var.mediaNodeInstanceType, "n4a-") || startswith(var.mediaNodeInstanceType, "a4x-")
  media_ubuntu_image    = local.is_arm_media_instance ? "ubuntu-os-cloud/ubuntu-2404-noble-arm64-v20241219" : "ubuntu-os-cloud/ubuntu-2404-noble-amd64-v20241219"
  is_c4a_instance_media = startswith(var.mediaNodeInstanceType, "c4a-")
}

# Media Node Instance Template
resource "google_compute_instance_template" "media_node_template" {
  name         = lower("${var.stackName}-media-node-template")
  machine_type = var.mediaNodeInstanceType
  tags         = [lower("${var.stackName}-media-node")]

  disk {
    source_image = local.media_ubuntu_image
    auto_delete  = true
    boot         = true
    disk_size_gb = 100
    disk_type    = local.is_c4a_instance_media ? "hyperdisk-balanced" : "pd-standard"
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    stackName               = var.stackName
    masterNodePrivateIPList = "${google_compute_instance.openvidu_master_node_1.network_interface[0].network_ip},${google_compute_instance.openvidu_master_node_2.network_interface[0].network_ip},${google_compute_instance.openvidu_master_node_3.network_interface[0].network_ip},${google_compute_instance.openvidu_master_node_4.network_interface[0].network_ip}"
    bucketAppDataName       = local.isEmptyAppData ? google_storage_bucket.appdata_bucket[0].name : var.GCSAppDataBucketName
    bucketClusterDataName   = local.isEmptyClusterData ? google_storage_bucket.clusterdata_bucket[0].name : var.GCSClusterDataBucketName
    region                  = var.region
    shutdown-script         = local.graceful_shutdown_script
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

  depends_on = [
    google_compute_instance.openvidu_master_node_1,
    google_compute_instance.openvidu_master_node_2,
    google_compute_instance.openvidu_master_node_3,
    google_compute_instance.openvidu_master_node_4
  ]
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

  depends_on = [
    google_compute_instance.openvidu_master_node_1,
    google_compute_instance.openvidu_master_node_2,
    google_compute_instance.openvidu_master_node_3,
    google_compute_instance.openvidu_master_node_4
  ]
}

# Autoscaler for Media Nodes
resource "google_compute_region_autoscaler" "media_node_autoscaler" {
  name   = lower("${var.stackName}-media-node-autoscaler")
  region = var.region
  target = google_compute_region_instance_group_manager.media_node_group.self_link

  autoscaling_policy {
    max_replicas    = var.maxNumberOfMediaNodes
    min_replicas    = var.minNumberOfMediaNodes
    cooldown_period = 260

    cpu_utilization {
      target = var.scaleTargetCPU / 100.0
    }

    mode = "ONLY_SCALE_OUT"
  }
}

# ------------------------- local values -------------------------

locals {
  isEmptyAppData     = var.GCSAppDataBucketName == ""
  isEmptyClusterData = var.GCSClusterDataBucketName == ""

  install_script_master = <<-EOF
#!/bin/bash -x
set -e

OPENVIDU_VERSION=main
DOMAIN=
YQ_VERSION=v4.44.5

echo "DPkg::Lock::Timeout \"-1\";" > /etc/apt/apt.conf.d/99timeout

apt-get update && apt-get install -y \
  curl \
  unzip \
  jq \
  wget \
  ca-certificates \
  gnupg \
  lsb-release \
  openssl

wget https://github.com/mikefarah/yq/releases/download/$${YQ_VERSION}/yq_linux_${local.yq_arch}.tar.gz -O - |\
tar xz && mv yq_linux_${local.yq_arch} /usr/bin/yq

# Configure gcloud with instance service account
gcloud auth activate-service-account --key-file=/dev/null 2>/dev/null || true
METADATA_URL="http://metadata.google.internal/computeMetadata/v1"
get_meta() { curl -s -H "Metadata-Flavor: Google" "$${METADATA_URL}/$1"; }

# Get master node number from metadata
MASTER_NODE_NUM=$(get_meta "instance/attributes/masterNodeNum")

# Get own private IP
PRIVATE_IP=$(get_meta "instance/network-interfaces/0/ip")

# Store current private IP
PRIVATE_IP="$(/usr/local/bin/store_secret.sh save MASTER_NODE_$${MASTER_NODE_NUM}_PRIVATE_IP $PRIVATE_IP)"

# Check if secrets have been generated
ALL_SECRETS_GENERATED=$(gcloud secrets versions access latest --secret=ALL_SECRETS_GENERATED 2>/dev/null || echo "false")

# If this is master node 1 and secrets haven't been generated, generate them
if [[ $MASTER_NODE_NUM -eq 1 ]] && [[ "$ALL_SECRETS_GENERATED" == "false" ]]; then
  # Configure Domain name
  if [[ "${var.domainName}" == "" ]]; then
    EXTERNAL_IP=$(gcloud compute addresses describe "${lower("${var.stackName}-nlb-ip")}" --region ${var.region} --format="get(address)")
    RANDOM_DOMAIN_STRING=$(tr -dc 'a-z' < /dev/urandom | head -c 8)
    DOMAIN="openvidu-$RANDOM_DOMAIN_STRING-$(echo $EXTERNAL_IP | tr '.' '-').sslip.io"
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

  # Store usernames and generate random passwords
  OPENVIDU_PRO_LICENSE="$(/usr/local/bin/store_secret.sh save OPENVIDU_PRO_LICENSE "${var.openviduLicense}")"
  OPENVIDU_RTC_ENGINE="$(/usr/local/bin/store_secret.sh save OPENVIDU_RTC_ENGINE "${var.rtcEngine}")"
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
  LIVEKIT_API_KEY="$(/usr/local/bin/store_secret.sh generate LIVEKIT_API_KEY "API" 12)"
  LIVEKIT_API_SECRET="$(/usr/local/bin/store_secret.sh generate LIVEKIT_API_SECRET)"
  OPENVIDU_VERSION="$(/usr/local/bin/store_secret.sh save OPENVIDU_VERSION "$OPENVIDU_VERSION")"
  ENABLED_MODULES="$(/usr/local/bin/store_secret.sh save ENABLED_MODULES "observability,openviduMeet,v2compatibility")"
  ALL_SECRETS_GENERATED="$(/usr/local/bin/store_secret.sh save ALL_SECRETS_GENERATED "true")"
fi

# Wait for all master nodes to store their private IPs
while true; do
  MASTER_NODE_1_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_1_PRIVATE_IP 2>/dev/null || echo "")
  MASTER_NODE_2_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_2_PRIVATE_IP 2>/dev/null || echo "")
  MASTER_NODE_3_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_3_PRIVATE_IP 2>/dev/null || echo "")
  MASTER_NODE_4_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_4_PRIVATE_IP 2>/dev/null || echo "")

  # Check if all master nodes have stored their private IPs
  if [[ "$MASTER_NODE_1_PRIVATE_IP" != "" ]] &&
      [[ "$MASTER_NODE_2_PRIVATE_IP" != "" ]] &&
      [[ "$MASTER_NODE_3_PRIVATE_IP" != "" ]] &&
      [[ "$MASTER_NODE_4_PRIVATE_IP" != "" ]]; then
    break
  fi
  sleep 5
done

# Fetch all values from Secret Manager
MASTER_NODE_1_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_1_PRIVATE_IP)
MASTER_NODE_2_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_2_PRIVATE_IP)
MASTER_NODE_3_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_3_PRIVATE_IP)
MASTER_NODE_4_PRIVATE_IP=$(gcloud secrets versions access latest --secret=MASTER_NODE_4_PRIVATE_IP)
MASTER_NODE_PRIVATE_IP_LIST="$MASTER_NODE_1_PRIVATE_IP,$MASTER_NODE_2_PRIVATE_IP,$MASTER_NODE_3_PRIVATE_IP,$MASTER_NODE_4_PRIVATE_IP"

DOMAIN=$(gcloud secrets versions access latest --secret=DOMAIN_NAME)
OPENVIDU_PRO_LICENSE=$(gcloud secrets versions access latest --secret=OPENVIDU_PRO_LICENSE)
OPENVIDU_RTC_ENGINE=$(gcloud secrets versions access latest --secret=OPENVIDU_RTC_ENGINE)
REDIS_PASSWORD=$(gcloud secrets versions access latest --secret=REDIS_PASSWORD)
MONGO_ADMIN_USERNAME=$(gcloud secrets versions access latest --secret=MONGO_ADMIN_USERNAME)
MONGO_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=MONGO_ADMIN_PASSWORD)
MONGO_REPLICA_SET_KEY=$(gcloud secrets versions access latest --secret=MONGO_REPLICA_SET_KEY)
MINIO_ACCESS_KEY=$(gcloud secrets versions access latest --secret=MINIO_ACCESS_KEY)
MINIO_SECRET_KEY=$(gcloud secrets versions access latest --secret=MINIO_SECRET_KEY)
DASHBOARD_ADMIN_USERNAME=$(gcloud secrets versions access latest --secret=DASHBOARD_ADMIN_USERNAME)
DASHBOARD_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=DASHBOARD_ADMIN_PASSWORD)
GRAFANA_ADMIN_USERNAME=$(gcloud secrets versions access latest --secret=GRAFANA_ADMIN_USERNAME)
GRAFANA_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=GRAFANA_ADMIN_PASSWORD)
MEET_INITIAL_ADMIN_USER=$(gcloud secrets versions access latest --secret=MEET_INITIAL_ADMIN_USER)
MEET_INITIAL_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret=MEET_INITIAL_ADMIN_PASSWORD)
if [[ "${var.initialMeetApiKey}" != '' ]]; then
  MEET_INITIAL_API_KEY=$(gcloud secrets versions access latest --secret=MEET_INITIAL_API_KEY)
fi
LIVEKIT_API_KEY=$(gcloud secrets versions access latest --secret=LIVEKIT_API_KEY)
LIVEKIT_API_SECRET=$(gcloud secrets versions access latest --secret=LIVEKIT_API_SECRET)
ENABLED_MODULES=$(gcloud secrets versions access latest --secret=ENABLED_MODULES)

# Build install command
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/ha/$OPENVIDU_VERSION/install_ov_master_node.sh)"

# Common arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=gcp"
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
  # Use base64 encoded certificates directly
  OWN_CERT_CRT=${var.ownPublicCertificate}
  OWN_CERT_KEY=${var.ownPrivateCertificate}

  CERT_ARGS=(
    "--certificate-type=owncert"
    "--owncert-public-key=$OWN_CERT_CRT"
    "--owncert-private-key=$OWN_CERT_KEY"
  )
fi

# Construct the final command
FINAL_COMMAND="$INSTALL_COMMAND $(printf "%s " "$${COMMON_ARGS[@]}") $(printf "%s " "$${CERT_ARGS[@]}")"

# Install OpenVidu
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
EXTERNAL_S3_BUCKET_APP_DATA=$(get_meta "instance/attributes/bucketAppDataName")
EXTERNAL_S3_BUCKET_CLUSTER_DATA=$(get_meta "instance/attributes/bucketClusterDataName")

# Update egress.yaml to use hardcoded credentials instead of env variable
if [ -f "$${CLUSTER_CONFIG_DIR}/media_node/egress.yaml" ]; then
  yq eval --inplace '.storage.gcp.credentials_json = (load("/credentials.json") | tostring) | .storage.gcp.credentials_json style="single"' $${CLUSTER_CONFIG_DIR}/media_node/egress.yaml
fi

sed -i "s|EXTERNAL_S3_ENDPOINT=.*|EXTERNAL_S3_ENDPOINT=$EXTERNAL_S3_ENDPOINT|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_REGION=.*|EXTERNAL_S3_REGION=$EXTERNAL_S3_REGION|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_PATH_STYLE_ACCESS=.*|EXTERNAL_S3_PATH_STYLE_ACCESS=$EXTERNAL_S3_PATH_STYLE_ACCESS|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_BUCKET_APP_DATA=.*|EXTERNAL_S3_BUCKET_APP_DATA=$EXTERNAL_S3_BUCKET_APP_DATA|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
sed -i "s|EXTERNAL_S3_BUCKET_CLUSTER_DATA=.*|EXTERNAL_S3_BUCKET_CLUSTER_DATA=$EXTERNAL_S3_BUCKET_CLUSTER_DATA|" "$${CLUSTER_CONFIG_DIR}/openvidu.env"
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
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" "$${MASTER_NODE_CONFIG_DIR}/master_node.env"
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
sed -i "s/MEET_INITIAL_ADMIN_USER=.*/MEET_INITIAL_ADMIN_USER=$MEET_INITIAL_ADMIN_USER/" "$${CLUSTER_CONFIG_DIR}/master_node/meet.env"
sed -i "s/MEET_INITIAL_ADMIN_PASSWORD=.*/MEET_INITIAL_ADMIN_PASSWORD=$MEET_INITIAL_ADMIN_PASSWORD/" "$${CLUSTER_CONFIG_DIR}/master_node/meet.env"
if [[ "${var.initialMeetApiKey}" != '' ]]; then
  sed -i "s/MEET_INITIAL_API_KEY=.*/MEET_INITIAL_API_KEY=$MEET_INITIAL_API_KEY/" "$${CLUSTER_CONFIG_DIR}/master_node/meet.env"
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
REDIS_PASSWORD="$(/usr/local/bin/get_value_from_config.sh REDIS_PASSWORD "$${MASTER_NODE_CONFIG_DIR}/master_node.env")"
DOMAIN_NAME="$(/usr/local/bin/get_value_from_config.sh DOMAIN_NAME "$${CLUSTER_CONFIG_DIR}/openvidu.env")"
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
MEET_INITIAL_ADMIN_USER="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_ADMIN_USER "$${CLUSTER_CONFIG_DIR}/master_node/meet.env")"
MEET_INITIAL_ADMIN_PASSWORD="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_ADMIN_PASSWORD "$${CLUSTER_CONFIG_DIR}/master_node/meet.env")"
if [[ "${var.initialMeetApiKey}" != '' ]]; then
  MEET_INITIAL_API_KEY="$(/usr/local/bin/get_value_from_config.sh MEET_INITIAL_API_KEY "$${CLUSTER_CONFIG_DIR}/master_node/meet.env")"
fi
ENABLED_MODULES="$(/usr/local/bin/get_value_from_config.sh ENABLED_MODULES "$${CLUSTER_CONFIG_DIR}/openvidu.env")"

# Update shared secret
echo -n "$REDIS_PASSWORD" | gcloud secrets versions add REDIS_PASSWORD --data-file=-
echo -n "$DOMAIN_NAME" | gcloud secrets versions add DOMAIN_NAME --data-file=-
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
        echo "Error saving secret"
    fi
    echo "$SECRET_VALUE"
else
    exit 1
fi
EOF

  check_app_ready_script = <<-EOF
#!/bin/bash
while true; do
  HTTP_STATUS=$(curl -Ik http://localhost:7880 2>/dev/null | head -n1 | awk '{print $2}')
  if [ "$HTTP_STATUS" == "200" ]; then
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

# Check if installation already completed
if [ -f /usr/local/bin/openvidu_install_counter.txt ]; then
  # Launch on reboot
  systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; exit 1; }
else
  # Create scripts
  cat > /usr/local/bin/install.sh << 'INSTALL_EOF'
${local.install_script_master}
INSTALL_EOF
  chmod +x /usr/local/bin/install.sh

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


  cat > /usr/local/bin/store_secret.sh << 'STORE_SECRET_EOF'
${local.store_secret_script}
STORE_SECRET_EOF
  chmod +x /usr/local/bin/store_secret.sh

  cat > /usr/local/bin/check_app_ready.sh << 'CHECK_APP_EOF'
${local.check_app_ready_script}
CHECK_APP_EOF
  chmod +x /usr/local/bin/check_app_ready.sh

  cat > /usr/local/bin/config_s3.sh << 'CONFIG_S3_EOF'
${local.config_s3_script}
CONFIG_S3_EOF
  chmod +x /usr/local/bin/config_s3.sh

  echo "DPkg::Lock::Timeout \"-1\";" > /etc/apt/apt.conf.d/99timeout

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

  # Config S3 buckets
  /usr/local/bin/config_s3.sh || { echo "[OpenVidu] error configuring S3 buckets"; exit 1; }

  # Start OpenVidu
  systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; exit 1; }

  # Update shared secret
  /usr/local/bin/after_install.sh || { echo "[OpenVidu] error updating shared secret"; exit 1; }

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
echo "DPkg::Lock::Timeout \"-1\";" > /etc/apt/apt.conf.d/99timeout

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
MASTER_NODE_PRIVATE_IP_LIST=$(get_meta "instance/attributes/masterNodePrivateIPList")
STACK_NAME=$(get_meta "instance/attributes/stackName")
PRIVATE_IP=$(get_meta "instance/network-interfaces/0/ip")

# Wait for master nodes to be ready by checking secrets
while ! gcloud secrets versions access latest --secret=ALL_SECRETS_GENERATED 2>/dev/null | grep -q "true"; do
  echo "Waiting for master nodes to initialize secrets..."
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
INSTALL_COMMAND="sh <(curl -fsSL http://get.openvidu.io/pro/ha/$OPENVIDU_VERSION/install_ov_media_node.sh)"

# Media node arguments
COMMON_ARGS=(
  "--no-tty"
  "--install"
  "--environment=gcp"
  "--deployment-type=ha"
  "--node-role=media-node"
  "--master-node-private-ip-list=$MASTER_NODE_PRIVATE_IP_LIST"
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

echo "Starting graceful shutdown of OpenVidu Media Node..."

INSTANCE_NAME=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/name" -H "Metadata-Flavor: Google")
PROJECT_ID=$(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")
ZONE=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/zone" -H "Metadata-Flavor: Google" | cut -d'/' -f4)

# Execute if docker is installed
if [ -x "$(command -v docker)" ]; then
  echo "Stopping media node services and waiting for termination..."
  docker container kill --signal=SIGQUIT openvidu || true
  docker container kill --signal=SIGQUIT ingress || true
  docker container kill --signal=SIGQUIT egress || true
  for agent_container in $(docker ps --filter "label=openvidu-agent=true" --format '{{.Names}}'); do
    docker container kill --signal=SIGQUIT "$agent_container"
  done

  # Wait for running containers to stop
  while [ $(docker ps --filter "label=openvidu-agent=true" -q | wc -l) -gt 0 ] || \
        [ $(docker inspect -f '{{.State.Running}}' openvidu 2>/dev/null) == "true" ] || \
        [ $(docker inspect -f '{{.State.Running}}' ingress 2>/dev/null) == "true" ] || \
        [ $(docker inspect -f '{{.State.Running}}' egress 2>/dev/null) == "true" ]; do
    echo "Waiting for containers to stop..."
    sleep 10
  done
fi

# Self-delete using gcloud API
gcloud compute instances delete "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --quiet \
  --no-user-output-enabled || echo "Failed to self-delete, instance may already be terminating"

echo "Graceful shutdown completed."
EOF

  crontab_job_media = <<-EOF
#!/bin/bash -x
set -e

# Get current instance details
INSTANCE_NAME=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/name" -H "Metadata-Flavor: Google")
PROJECT_ID=$(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")
ZONE=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/zone" -H "Metadata-Flavor: Google" | cut -d'/' -f4)

# Check if instance is still managed by the MIG
MIG_NAME=$(echo "${var.stackName}" | tr '[:upper:]' '[:lower:]')-media-node-group
REGION=$(echo $ZONE | sed 's/-[a-z]$//')

# Check if this instance is still part of the MIG
INSTANCE_IN_MIG=$(gcloud compute instance-groups managed list-instances "$MIG_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(NAME)" | grep "$INSTANCE_NAME" || echo "")

if [ -n "$INSTANCE_IN_MIG" ]; then
  echo "Instance $INSTANCE_NAME is still managed by MIG. Continuing normal operation..."
  exit 0
else
  echo "Instance $INSTANCE_NAME has been abandoned from MIG. Starting graceful shutdown..."
  /usr/local/bin/graceful_shutdown.sh
fi
EOF

  user_data_media = <<-EOF
#!/bin/bash -x
set -eu -o pipefail

# Create scripts
cat > /usr/local/bin/install.sh << 'INSTALL_EOF'
${local.install_script_media}
INSTALL_EOF
chmod +x /usr/local/bin/install.sh

cat > /usr/local/bin/graceful_shutdown.sh << 'GRACEFUL_SHUTDOWN_EOF'
${local.graceful_shutdown_script}
GRACEFUL_SHUTDOWN_EOF
chmod +x /usr/local/bin/graceful_shutdown.sh

echo "DPkg::Lock::Timeout \"-1\";" > /etc/apt/apt.conf.d/99timeout

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

# Mark installation as complete
echo "installation_complete" > /usr/local/bin/openvidu_install_counter.txt

# Start OpenVidu
systemctl start openvidu || { echo "[OpenVidu] error starting OpenVidu"; exit 1; }

# Add cron job to check if instance is abandoned every minute
cat > /usr/local/bin/check_abandoned.sh << 'CHECK_ABANDONED_EOF'
${local.crontab_job_media}
CHECK_ABANDONED_EOF
chmod +x /usr/local/bin/check_abandoned.sh

echo "*/1 * * * * /usr/local/bin/check_abandoned.sh > /var/log/openvidu-abandoned-check.log 2>&1" | crontab -
EOF
}
