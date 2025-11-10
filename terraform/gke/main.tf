terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# GKE Autopilot Cluster
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  # Autopilot mode - fully managed
  enable_autopilot = var.autopilot_enabled

  # Only create these for standard clusters
  dynamic "node_config" {
    for_each = var.autopilot_enabled ? [] : [1]
    content {
      machine_type = var.machine_type
      oauth_scopes = [
        "https://www.googleapis.com/auth/cloud-platform"
      ]

      labels = {
        env = var.environment
      }

      tags = ["gke-node", "${var.cluster_name}-node"]
    }
  }

  # Initial node count for standard clusters
  initial_node_count = var.autopilot_enabled ? null : 1

  # Network configuration
  network    = "default"
  subnetwork = "default"

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Release channel
  release_channel {
    channel = var.release_channel
  }

  # Workload identity for better security
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Add-ons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }
}

# Node pool for standard clusters with autoscaling
resource "google_container_node_pool" "primary_nodes" {
  count      = var.autopilot_enabled ? 0 : 1
  name       = "${var.cluster_name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.min_nodes

  autoscaling {
    min_node_count = var.min_nodes
    max_node_count = var.max_nodes
  }

  node_config {
    preemptible  = var.use_preemptible
    machine_type = var.machine_type

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      env = var.environment
    }

    tags = ["gke-node", "${var.cluster_name}-node"]

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Output cluster information
output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "region" {
  description = "GKE cluster region"
  value       = var.region
}

output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "get_credentials_command" {
  description = "Command to get cluster credentials"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --region ${var.region} --project ${var.project_id}"
}
