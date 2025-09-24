# ------------------------- outputs.tf -------------------------

output "openvidu_instance_name" {
  value = google_compute_instance.openvidu_server.name
}

output "openvidu_public_ip" {
  value = length(google_compute_address.public_ip_address) > 0 ? google_compute_address.public_ip_address[0].address : google_compute_instance.openvidu_server.network_interface[0].access_config[0].nat_ip
}

output "appdata_bucket" {
  value = local.isEmpty ? google_storage_bucket.bucket[0].name : var.bucketName
}
