# ------------------------- variables -------------------------

# Variables used by the configuration
variable "projectId" {
  description = "GCP project id where the resourw es will be created."
  type        = string
}

variable "region" {
  description = "GCP region where resources will be created."
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "GCP zone that some resources will use."
  type        = string
  default     = "europe-west1-b"
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

variable "instanceType" {
  description = "Specifies the GCE machine type for your OpenVidu instance"
  type        = string
  default     = "e2-standard-8"
  validation {
    condition     = can(regex("^(e2-(micro|small|medium|standard-[2-9]|standard-1[0-6]|highmem-[2-9]|highmem-1[0-6]|highcpu-[2-9]|highcpu-1[0-6])|n1-(standard-[1-9]|standard-[1-9][0-9]|highmem-[2-9]|highmem-[1-9][0-9]|highcpu-[1-9]|highcpu-[1-9][0-9])|n2-(standard-[2-9]|standard-[1-9][0-9]|standard-1[0-2][0-8]|highmem-[2-9]|highmem-[1-9][0-9]|highmem-1[0-2][0-8]|highcpu-[1-9][0-9]|highcpu-1[0-2][0-8])|n2d-(standard-[2-9]|standard-[1-9][0-9]|standard-2[0-2][0-4]|highmem-[2-9]|highmem-[1-9][0-9]|highmem-9[0-6]|highcpu-[1-9][0-9]|highcpu-2[0-2][0-4])|c2-(standard-[4-9]|standard-[1-5][0-9]|standard-60)|c2d-(standard-[2-9]|standard-[1-9][0-9]|standard-1[0-1][0-2]|highmem-[2-9]|highmem-[1-9][0-9]|highmem-1[0-1][0-2]|highcpu-[1-9][0-9]|highcpu-1[0-1][0-2])|m1-(ultramem-[4-9][0-9]|ultramem-160)|m2-(ultramem-208|ultramem-416|megamem-416)|m3-(ultramem-32|ultramem-64|ultramem-128|megamem-64|megamem-128)|a2-(standard-[1-9]|standard-[1-9][0-9]|standard-96|highmem-1g|ultramem-1g|megamem-1g)|a3-(standard-[1-9]|standard-[1-9][0-9]|standard-80|highmem-1g|megamem-1g)|g2-(standard-[4-9]|standard-[1-9][0-9]|standard-96)|t2d-(standard-[1-9]|standard-[1-9][0-9]|standard-60)|t2a-(standard-[1-9]|standard-[1-9][0-9]|standard-48)|h3-(standard-88)|f1-(micro)|t4g-(micro|small|medium|standard-[1-9]|standard-[1-9][0-9]))$", var.instanceType))
    error_message = "The instance type is not valid"
  }
}

variable "bucketName" {
  description = "Name of the S3 bucket to store data and recordings. If empty, a bucket will be created"
  type        = string
  default     = ""
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