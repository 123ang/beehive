# 🚀 Google KMS Quick Start Guide

## Quick Setup (5 minutes)

### Step 1: Install Package

```bash
cd apps/api
pnpm add @google-cloud/kms
```

### Step 2: Set Up Google Cloud (One-time)

```bash
# 1. Login to Google Cloud
gcloud auth login

# 2. Create project (or use existing)
gcloud projects create beehive-kms --name="Beehive KMS"
gcloud config set project beehive-kms

# 3. Enable KMS API
gcloud services enable cloudkms.googleapis.com

# 4. Create key ring
gcloud kms keyrings create beehive-keyring --location=us

# 5. Create crypto key
gcloud kms keys create company-private-key \
  --keyring=beehive-keyring \
  --location=us \
  --purpose=encryption

# 6. Create service account
gcloud iam service-accounts create beehive-kms-service \
  --display-name="Beehive KMS Service Account"

# 7. Grant decrypt permission
gcloud kms keys add-iam-policy-binding company-private-key \
  --location=us \
  --keyring=beehive-keyring \
  --member="serviceAccount:beehive-kms-service@beehive-kms.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyDecrypter"

# 8. Create service account key
gcloud iam service-accounts keys create kms-service-account.json \
  --iam-account=beehive-kms-service@beehive-kms.iam.gserviceaccount.com

# 9. Move to secure location
# Windows:
move kms-service-account.json C:\secure\kms-service-account.json

# Linux/Mac:
mv kms-service-account.json ~/.secure/kms-service-account.json
```

### Step 3: Encrypt Your Private Key

```bash
# Replace YOUR_PRIVATE_KEY with your actual private key
echo "YOUR_PRIVATE_KEY" | gcloud kms encrypt \
  --plaintext-file=- \
  --ciphertext-file=encrypted-key.enc \
  --key=company-private-key \
  --keyring=beehive-keyring \
  --location=us

# Move encrypted key to project
# Windows:
move encrypted-key.enc apps\api\secrets\encrypted-key.enc

# Linux/Mac:
mkdir -p apps/api/secrets
mv encrypted-key.enc apps/api/secrets/encrypted-key.enc
```

### Step 4: Update .env File

```env
# Enable Google KMS
USE_GOOGLE_KMS=true

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=beehive-kms
GOOGLE_KMS_LOCATION=us
GOOGLE_KMS_KEY_RING=beehive-keyring
GOOGLE_KMS_KEY_NAME=company-private-key

# Service Account Key Path
GOOGLE_APPLICATION_CREDENTIALS=C:\secure\kms-service-account.json

# Encrypted Key Path
GOOGLE_KMS_ENCRYPTED_KEY_PATH=apps\api\secrets\encrypted-key.enc

# Remove or comment out old private key
# COMPANY_PRIVATE_KEY=...
```

### Step 5: Test

```bash
cd apps/api
pnpm dev
```

You should see:
```
✅ KMSService initialized successfully
✅ Retrieved private key from Google KMS
✅ BlockchainService initialized successfully
```

---

## Troubleshooting

### Error: "Permission denied"
```bash
# Re-grant permission
gcloud kms keys add-iam-policy-binding company-private-key \
  --location=us \
  --keyring=beehive-keyring \
  --member="serviceAccount:beehive-kms-service@beehive-kms.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyDecrypter"
```

### Error: "Key not found"
```bash
# Verify key exists
gcloud kms keys list --keyring=beehive-keyring --location=us
```

### Error: "Service account key not found"
- Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Verify file exists and is valid JSON

---

## Fallback to .env

If KMS fails, the system will automatically fall back to `.env` file (if `USE_GOOGLE_KMS` is not set to `true`).

To disable KMS and use `.env`:
```env
USE_GOOGLE_KMS=false
COMPANY_PRIVATE_KEY=your_private_key_here
```

---

For detailed setup, see `docs/GOOGLE_KMS_SETUP_GUIDE.md`

