# ------------------------- variables -------------------------

# Variables used by the configuration
variable "projectId" {
  description = "GCP project id where the resources will be created."
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
    condition     = can(regex("^(selfsigned|owncert|letsencrypt)$", var.certificateType))
    error_message = "certificateType must be 'selfsigned', 'owncert', or 'letsencrypt'."
  }
}

variable "domainName" {
  description = "Domain name for the OpenVidu Deployment."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^$|^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$", var.domainName))
    error_message = "domainName must be a valid domain name or empty."
  }
}

variable "ownPublicCertificate" {
  description = "If certificate type is 'owncert', this parameter will be used to specify the public certificate"
  type        = string
  default     = ""
}

variable "ownPrivateCertificate" {
  description = "If certificate type is 'owncert', this parameter will be used to specify the private certificate"
  type        = string
  default     = ""
}

variable "initialMeetAdminPassword" {
  description = "Initial password for the 'admin' user in OpenVidu Meet. If not provided, a random password will be generated."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^$|^[A-Za-z0-9]+$", var.initialMeetAdminPassword))
    error_message = "initialMeetAdminPassword must contain only alphanumeric characters or be empty."
  }
}

variable "initialMeetApiKey" {
  description = "Initial API key for OpenVidu Meet. If not provided, no API key will be set and the user can set it later from Meet Console."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^$|^[A-Za-z0-9]+$", var.initialMeetApiKey))
    error_message = "initialMeetApiKey must contain only alphanumeric characters or be empty."
  }
}

variable "masterNodesInstanceType" {
  description = "Specifies the GCE machine type for your OpenVidu Master Nodes"
  type        = string
  default     = "e2-standard-2"
  validation {
    condition     = can(regex("^(e2-standard-[248]|e2-highmem-[248]|n1-standard-[1248]|n1-highmem-[248]|n2-standard-[248]|n2-highmem-[248])$", var.masterNodesInstanceType))
    error_message = "masterNodesInstanceType must be a valid GCE machine type."
  }
}

variable "masterNodesDiskSize" {
  description = "Size of the disk in GB for master nodes"
  type        = number
  default     = 100
  validation {
    condition     = var.masterNodesDiskSize >= 50
    error_message = "masterNodesDiskSize must be at least 50 GB."
  }
}

variable "mediaNodeInstanceType" {
  description = "Specifies the GCE machine type for your OpenVidu Media Nodes"
  type        = string
  default     = "e2-standard-2"
  validation {
    condition     = can(regex("^(e2-standard-[248]|e2-highmem-[248]|n1-standard-[1248]|n1-highmem-[248]|n2-standard-[248]|n2-highmem-[248])$", var.mediaNodeInstanceType))
    error_message = "mediaNodeInstanceType must be a valid GCE machine type."
  }
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

variable "GCSAppDataBucketName" {
  description = "Name of the GCS bucket to store application data and recordings. If empty, a bucket will be created"
  type        = string
  default     = ""
}

variable "GCSClusterDataBucketName" {
  description = "Name of the GCS bucket to store cluster data. If empty, a bucket will be created"
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
    condition     = can(regex("^(pion|mediasoup)$", var.rtcEngine))
    error_message = "rtcEngine must be 'pion' or 'mediasoup'."
  }
}

variable "additionalInstallFlags" {
  description = "Additional optional flags to pass to the OpenVidu installer (comma-separated, e.g.,'--flag1=value, --flag2')."
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^$|^(\\s*--[a-zA-Z0-9_-]+(=[^,]*)?\\s*,?\\s*)*$", var.additionalInstallFlags))
    error_message = "additionalInstallFlags must be a comma-separated list of flags or empty."
  }
}

variable "turnDomainName" {
  description = "(Optional) Domain name for the TURN server with TLS. Only needed if your users are behind restrictive firewalls"
  type        = string
  default     = ""
}

variable "turnOwnPublicCertificate" {
  description = "(Optional) This setting is applicable if the certificate type is set to 'owncert' and the TurnDomainName is specified."
  type        = string
  default     = ""
}

variable "turnOwnPrivateCertificate" {
  description = "(Optional) This setting is applicable if the certificate type is set to 'owncert' and the TurnDomainName is specified."
  type        = string
  default     = ""
}
