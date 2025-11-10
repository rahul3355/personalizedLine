variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "personalizedline"
}

variable "autopilot_enabled" {
  description = "Enable GKE Autopilot mode (fully managed)"
  type        = bool
  default     = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "release_channel" {
  description = "GKE release channel (RAPID, REGULAR, STABLE)"
  type        = string
  default     = "REGULAR"
}

# Standard cluster variables (ignored if autopilot is enabled)
variable "machine_type" {
  description = "Machine type for nodes (standard clusters only)"
  type        = string
  default     = "n1-standard-2"
}

variable "min_nodes" {
  description = "Minimum number of nodes (standard clusters only)"
  type        = number
  default     = 1
}

variable "max_nodes" {
  description = "Maximum number of nodes (standard clusters only)"
  type        = number
  default     = 10
}

variable "use_preemptible" {
  description = "Use preemptible VMs for cost savings (standard clusters only)"
  type        = bool
  default     = false
}
