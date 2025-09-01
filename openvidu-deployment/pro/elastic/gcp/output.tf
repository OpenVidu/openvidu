# ------------------------- outputs.tf -------------------------

output "openvidu_master_node_name" {
  value = google_compute_instance.openvidu_master_node.name
}

output "openvidu_public_ip" {
  value = var.publicIpAddress == "" ? google_compute_address.public_ip_address[0].address : var.publicIpAddress
}

output "appdata_bucket" {
  value = local.isEmpty ? google_storage_bucket.bucket[0].name : var.bucketName
}

output "media_node_group_name" {
  value = google_compute_region_instance_group_manager.media_node_group.name
}

output "services_and_credentials" {
  description = "Link to Secret Manager for services and credentials"
  value       = "https://console.cloud.google.com/security/secret-manager?project=${var.projectId}"
}
