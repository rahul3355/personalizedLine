#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GitHub Actions CI/CD Setup for GKE${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
PROJECT_ID="personalizedline-prod"
SA_NAME="github-actions-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="github-actions-key.json"

echo -e "${YELLOW}Step 1: Creating Service Account${NC}"
echo "Service Account: ${SA_EMAIL}"

# Create service account
if gcloud iam service-accounts describe ${SA_EMAIL} --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo -e "${YELLOW}Service account already exists, skipping creation${NC}"
else
    gcloud iam service-accounts create ${SA_NAME} \
        --display-name="GitHub Actions Deployer" \
        --description="Service account for GitHub Actions to deploy to GKE" \
        --project=${PROJECT_ID}
    echo -e "${GREEN}✓ Service account created${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Granting IAM Permissions${NC}"

# Grant necessary roles
ROLES=(
    "roles/container.developer"
    "roles/storage.admin"
    "roles/iam.serviceAccountUser"
)

for ROLE in "${ROLES[@]}"; do
    echo "Granting ${ROLE}..."
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="${ROLE}" \
        --quiet >/dev/null
    echo -e "${GREEN}✓ ${ROLE} granted${NC}"
done

echo ""
echo -e "${YELLOW}Step 3: Creating Service Account Key${NC}"

# Create and download key
if [ -f "${KEY_FILE}" ]; then
    echo -e "${YELLOW}Key file already exists, creating backup...${NC}"
    mv ${KEY_FILE} ${KEY_FILE}.backup.$(date +%s)
fi

gcloud iam service-accounts keys create ${KEY_FILE} \
    --iam-account=${SA_EMAIL} \
    --project=${PROJECT_ID}

echo -e "${GREEN}✓ Key created: ${KEY_FILE}${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Add the following secret to your GitHub repository:"
echo "   - Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo "   - Click 'New repository secret'"
echo ""
echo -e "   ${YELLOW}Secret Name:${NC} GCP_SA_KEY"
echo -e "   ${YELLOW}Secret Value:${NC} (paste the entire contents of ${KEY_FILE})"
echo ""
echo "   To view the key contents, run:"
echo -e "   ${GREEN}cat ${KEY_FILE}${NC}"
echo ""
echo "2. Commit and push the GitHub Actions workflows:"
echo -e "   ${GREEN}git add .github/workflows/${NC}"
echo -e "   ${GREEN}git commit -m \"Add CI/CD pipeline\"${NC}"
echo -e "   ${GREEN}git push origin main${NC}"
echo ""
echo "3. The deployment will trigger automatically on the next push to main!"
echo ""
echo -e "${RED}IMPORTANT:${NC}"
echo "- Keep ${KEY_FILE} secure and do NOT commit it to git"
echo "- The key is already in .gitignore"
echo "- Delete the key file after adding it to GitHub Secrets"
echo ""
echo -e "${YELLOW}To view the key content now:${NC}"
echo -e "${GREEN}cat ${KEY_FILE}${NC}"
echo ""
