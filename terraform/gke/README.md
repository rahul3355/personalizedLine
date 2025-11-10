# Terraform Configuration for GKE

This directory contains Terraform configurations to provision a GKE cluster for PersonalizedLine.

## Prerequisites

1. **Install Terraform:**
   ```bash
   brew install terraform  # macOS
   # or download from: https://www.terraform.io/downloads
   ```

2. **Install Google Cloud SDK:**
   ```bash
   brew install --cask google-cloud-sdk
   ```

3. **Authenticate:**
   ```bash
   gcloud auth application-default login
   ```

## Quick Start

### 1. Configure Variables

```bash
# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Required variables:**
- `project_id`: Your GCP project ID
- `region`: GCP region (default: us-central1)

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Preview Changes

```bash
terraform plan
```

### 4. Create Cluster

```bash
terraform apply
```

This will create:
- GKE Autopilot cluster (or Standard if configured)
- With auto-scaling enabled
- Workload identity configured
- In your specified region

**Time:** ~5-7 minutes

### 5. Get Credentials

```bash
# Terraform will output this command
terraform output -raw get_credentials_command | bash
```

Or manually:
```bash
gcloud container clusters get-credentials personalizedline --region us-central1
```

## Configuration Options

### Autopilot vs Standard

**Autopilot (Recommended):**
```hcl
autopilot_enabled = true
```
- Fully managed
- Pay per pod
- No node management
- Better security defaults

**Standard:**
```hcl
autopilot_enabled = false
machine_type      = "n1-standard-2"
min_nodes         = 1
max_nodes         = 10
use_preemptible   = false
```
- More control
- Custom machine types
- Can use preemptible VMs (80% discount)

### Cost Optimization

For **Standard clusters**, enable preemptible VMs:

```hcl
use_preemptible = true
```

This provides **80% cost savings** but nodes may be preempted.

## Outputs

After `terraform apply`, you'll get:

```bash
terraform output

# Outputs:
# cluster_name              = "personalizedline"
# region                    = "us-central1"
# project_id                = "your-project-id"
# get_credentials_command   = "gcloud container clusters get-credentials..."
```

## Managing Infrastructure

### Update Configuration

```bash
# Edit terraform.tfvars
nano terraform.tfvars

# Preview changes
terraform plan

# Apply changes
terraform apply
```

### Destroy Cluster

```bash
# This will DELETE the cluster and all resources
terraform destroy
```

## State Management

### Local State (Default)

State is stored locally in `terraform.tfstate`.

**Important:**
- Don't commit `terraform.tfstate` to git
- Back it up securely
- Share carefully with team

### Remote State (Recommended for Teams)

Store state in Google Cloud Storage:

```hcl
# Add to main.tf
terraform {
  backend "gcs" {
    bucket = "your-terraform-state-bucket"
    prefix = "personalizedline/gke"
  }
}
```

Create the bucket:
```bash
gsutil mb gs://your-terraform-state-bucket
gsutil versioning set on gs://your-terraform-state-bucket
```

## Examples

### Create Autopilot Cluster (Easiest)

```hcl
# terraform.tfvars
project_id        = "my-project"
region            = "us-central1"
autopilot_enabled = true
```

### Create Standard Cluster with Preemptible Nodes

```hcl
# terraform.tfvars
project_id        = "my-project"
region            = "us-central1"
autopilot_enabled = false
machine_type      = "n1-standard-2"
min_nodes         = 1
max_nodes         = 10
use_preemptible   = true
```

### Create Multi-region Cluster

```hcl
# terraform.tfvars
project_id   = "my-project"
region       = "us-central1"  # Multi-zonal by default
cluster_name = "personalizedline-prod"
```

## Next Steps

After cluster creation:

1. **Install KEDA:**
   ```bash
   cd ../..
   ./setup-gke.sh  # This will install KEDA if not present
   ```

2. **Deploy Application:**
   ```bash
   ./deploy-gke.sh
   ```

3. **Setup CI/CD:**
   - Add GitHub secrets (see GKE-DEPLOY.md)
   - Push to main branch to auto-deploy

## Troubleshooting

### Error: API not enabled

```bash
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
```

### Error: Permission denied

Ensure your account has these roles:
- Kubernetes Engine Admin
- Compute Admin
- Service Account User

```bash
# Add roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/container.admin"
```

### Error: Quota exceeded

Request quota increase:
https://console.cloud.google.com/iam-admin/quotas

Common quotas needed:
- CPUs: 100+
- In-use IP addresses: 100+
- Persistent Disk SSD (GB): 500+

## Cost Estimation

### Autopilot
- ~$0.10/hr per vCPU
- ~$0.012/hr per GB RAM
- **Idle:** ~$20-30/month
- **Peak (1000 workers):** ~$6-8/hour

### Standard
- n1-standard-2: ~$48/month per node
- Preemptible: ~$10/month per node (80% discount)
- **Minimum:** ~$48-96/month (1-2 nodes)
- **Peak:** Add ~$0.01/hr per pod

## Security Best Practices

1. **Enable Workload Identity** (already configured)
2. **Use Secret Manager** instead of k8s secrets
3. **Enable Binary Authorization**
4. **Configure Network Policies**
5. **Use Private GKE clusters** for production

See GKE-DEPLOY.md for production checklist.

## Resources

- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GKE Pricing](https://cloud.google.com/kubernetes-engine/pricing)
