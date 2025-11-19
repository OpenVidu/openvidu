# ------------------------- outputs.tf -------------------------

output "secrets_manager" {
  value = "https://console.cloud.google.com/security/secret-manager?project=${var.projectId}"
}
