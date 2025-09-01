# ------------------------- outputs.tf -------------------------

output "openvidu_instance_name" {
  value = google_compute_instance.openvidu.name
}

output "openvidu_public_ip" {
  value = length(google_compute_address.openvidu_ip) > 0 ? google_compute_address.openvidu_ip[0].address : google_compute_instance.openvidu.network_interface[0].access_config[0].nat_ip
}

# output "services_and_credentials_secret_id" {
#   value = google_secret_manager_secret.openvidu.secret_id
# }

output "appdata_bucket" {
  value = local.isEmpty ? "openvidu-appdata" : var.bucketName
}
