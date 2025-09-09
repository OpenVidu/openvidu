# ------------------------- variables -------------------------

# Variables used by the configuration
variable "projectId" {
  description = "GCP project id"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "europe-west1-b"
}

variable "stackName" {
  description = "Stack name for OpenVidu deployment"
  type        = string
}

variable "certificateType" {
  description = "[selfsigned] Not recommended for production use. If you don't have a FQDN, (DomainName parameter) you can use this option to generate a self-signed certificate. [owncert] Valid for productions environments. If you have a FQDN, (DomainName parameter) and an Elastic IP, you can use this option to use your own certificate. [letsencrypt] Valid for production environments. If you have a FQDN, (DomainName parameter) and an Elastic IP, you can use this option to generate a Let's Encrypt certificate."
  type        = string
  default     = "letsencrypt"
  validation {
    condition     = contains(["selfsigned", "owncert", "letsencrypt"], var.certificateType)
    error_message = "certificateType must be one of: selfsigned, owncert, letsencrypt"
  }
}

variable "publicIpAddress" {
  description = "Previously created Public IP address for the OpenVidu Deployment. Blank will generate a public IP"
  type        = string
  default     = ""
}

variable "domainName" {
  description = "Optional domain name for the deployment"
  type        = string
  default     = ""
}

variable "ownPublicCertificate" {
  description = "If owncert: URL to fullchain.pem"
  type        = string
  default     = ""
}

variable "ownPrivateCertificate" {
  description = "If owncert: URL to privkey.pem"
  type        = string
  default     = ""
}

variable "additionalInstallFlags" {
  description = "Comma-separated additional flags passed to the OpenVidu installer"
  type        = string
  default     = ""
}

variable "turnDomainName" {
  description = "Optional TURN server TLS domain"
  type        = string
  default     = ""
}

variable "turnOwnPublicCertificate" {
  description = "Optional TURN public cert URL for owncert"
  type        = string
  default     = ""
}

variable "turnOwnPrivateCertificate" {
  description = "Optional TURN private key URL for owncert"
  type        = string
  default     = ""
}

variable "instanceType" {
  description = "GCE machine type"
  type        = string
  default     = "e2-standard-8"
}

variable "bucketName" {
  description = "If empty, a GCS bucket will be created for app data and recordings"
  type        = string
  default     = ""
}

variable "meetInitialAdminPassword" {
  description = "Initial admin password for OpenVidu Meet"
  type        = string
  default     = ""
}
