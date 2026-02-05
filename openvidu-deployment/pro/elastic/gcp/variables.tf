# ------------------------- variables -------------------------

# Variables used by the configuration
variable "projectId" {
  description = "GCP project id where the resourw es will be created."
  type        = string
}

variable "region" {
  description = "GCP region where resources will be created."
  type        = string
  default     = "europe-west2"
}

variable "zone" {
  description = "GCP zone that some resources will use."
  type        = string
  default     = "europe-west2-b"
}

variable "stackName" {
  description = "Stack name for OpenVidu deployment."
  type        = string
}

variable "certificateType" {
  description = "[selfsigned] Not recommended for production use. Just for testing purposes or development environments. You don't need a FQDN to use this option. [owncert] Valid for production environments. Use your own certificate. You need a FQDN to use this option. [letsencrypt] Valid for production environments. Can be used with or without a FQDN (if no FQDN is provided, a random sslip.io domain will be used)."
  type        = string
  default     = "letsencrypt"
  validation {
    condition     = contains(["selfsigned", "owncert", "letsencrypt"], var.certificateType)
    error_message = "certificateType must be one of: selfsigned, owncert, letsencrypt"
  }
}

variable "publicIpAddress" {
  description = "Previously created Public IP address for the OpenVidu Deployment. Blank will generate a public IP."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^$|^([01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\.([01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\.([01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\.([01]?\\d{1,2}|2[0-4]\\d|25[0-5])$", var.publicIpAddress))
    error_message = "The Public Elastic IP does not have a valid IPv4 format"
  }
}

variable "domainName" {
  description = "Domain name for the OpenVidu Deployment."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^$|^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$", var.domainName))
    error_message = "The domain name does not have a valid domain name format"
  }
}

variable "ownPublicCertificate" {
  description = "If certificate type is 'owncert', this parameter will be used to specify the public certificate in base64 format"
  type        = string
  default     = ""
}

variable "ownPrivateCertificate" {
  description = "If certificate type is 'owncert', this parameter will be used to specify the private certificate in base64 format"
  type        = string
  default     = ""
}

variable "initialMeetAdminPassword" {
  description = "Initial password for the 'admin' user in OpenVidu Meet. If not provided, a random password will be generated."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^[A-Za-z0-9_-]*$", var.initialMeetAdminPassword))
    error_message = "Must contain only alphanumeric characters (A-Z, a-z, 0-9). Leave empty to generate a random password."
  }
}

variable "initialMeetApiKey" {
  description = "Initial API key for OpenVidu Meet. If not provided, no API key will be set and the user can set it later from Meet Console."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^[A-Za-z0-9_-]*$", var.initialMeetApiKey))
    error_message = "Must contain only alphanumeric characters (A-Z, a-z, 0-9). Leave empty to not set an initial API key."
  }
}

variable "masterNodeInstanceType" {
  description = "Specifies the GCE machine type for your OpenVidu Master Node"
  type        = string
  default     = "e2-standard-4"
}

variable "mediaNodeInstanceType" {
  description = "Specifies the GCE machine type for your OpenVidu Media Nodes"
  type        = string
  default     = "e2-standard-4"
}

variable "initialNumberOfMediaNodes" {
  description = "Number of initial media nodes to deploy"
  type        = number
  default     = 1
}

variable "minNumberOfMediaNodes" {
  description = "Minimum number of media nodes to deploy"
  type        = number
  default     = 1
}

variable "maxNumberOfMediaNodes" {
  description = "Maximum number of media nodes to deploy"
  type        = number
  default     = 5
}

variable "scaleTargetCPU" {
  description = "Target CPU percentage to scale up or down"
  type        = number
  default     = 50
}

variable "bucketName" {
  description = "Name of the GCS bucket to store data and recordings. If empty, a bucket will be created"
  type        = string
  default     = ""
}

variable "openviduLicense" {
  description = "Visit https://openvidu.io/account"
  type        = string
  sensitive   = true
}

variable "rtcEngine" {
  description = "RTCEngine media engine to use"
  type        = string
  default     = "pion"
  validation {
    condition     = contains(["pion", "mediasoup"], var.rtcEngine)
    error_message = "rtcEngine must be one of: pion, mediasoup"
  }
}

variable "additionalInstallFlags" {
  description = "Additional optional flags to pass to the OpenVidu installer (comma-separated, e.g.,'--flag1=value, --flag2')."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^[A-Za-z0-9, =_.\\-]*$", var.additionalInstallFlags))
    error_message = "Must be a comma-separated list of flags (for example, --flag=value, --bool-flag)."
  }
}
