# Google KMS Quick Start Guide

## Quick Setup (5 minutes)

### 1. Install Google Cloud SDK
```bash
# Download from: https://cloud.google.com/sdk/docs/install
# Or use PowerShell:
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
```

### 2. Authenticate & Setup
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable cloudkms.googleapis.com
```

### 3. Create Key Ring & Key
```bash
gcloud kms keyrings create beehive-keyring --location=global
gcloud kms keys create company-private-key --keyring=beehive-keyring --location=global --purpose=encryption
```

### 4. Create Service Account

**For Linux/Mac (Bash):**
```bash
PROJECT_ID=$(gcloud config get-value project)
gcloud iam service-accounts create kms-service-account --display-name="KMS Service Account"

SERVICE_ACCOUNT="${PROJECT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud kms keys add-iam-policy-binding company-private-key \
    --keyring=beehive-keyring \
    --location=global \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/cloudkms.cryptoKeyDecrypter"

gcloud iam service-accounts keys create kms-service-account.json --iam-account=${SERVICE_ACCOUNT}
```

**For Windows (PowerShell):**
```powershell
$PROJECT_ID = gcloud config get-value project

# Create service account (skip if already exists)
gcloud iam service-accounts create kms-service-account --display-name="KMS Service Account"

# IMPORTANT: Service account email format is: SERVICE_ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com
$SERVICE_ACCOUNT = "kms-service-account@$PROJECT_ID.iam.gserviceaccount.com"

# Grant decrypt permission
gcloud kms keys add-iam-policy-binding company-private-key `
    --keyring=beehive-keyring `
    --location=global `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/cloudkms.cryptoKeyDecrypter"

# Grant encrypt permission (needed for initial encryption)
gcloud kms keys add-iam-policy-binding company-private-key `
    --keyring=beehive-keyring `
    --location=global `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/cloudkms.cryptoKeyEncrypter"

# Create service account key file
gcloud iam service-accounts keys create kms-service-account.json --iam-account=$SERVICE_ACCOUNT
```

### 5. Encrypt Your Private Key

**Option A: Using the script (Recommended)**
```bash
cd apps/api
# Package is already installed, but if needed:
# pnpm install @google-cloud/kms

# Use the CommonJS version (works with ES modules project)
node scripts/encrypt-private-key.cjs
```

**Option B: Using gcloud CLI**
```bash
# Windows PowerShell
$PRIVATE_KEY = "your_private_key_without_0x"
$PRIVATE_KEY | Out-File -Encoding utf8 -NoNewline temp-key.txt
gcloud kms encrypt --plaintext-file=temp-key.txt --ciphertext-file=secrets/encrypted-key.enc --key=company-private-key --keyring=beehive-keyring --location=global
Remove-Item temp-key.txt
```

### 6. Update .env File
```env
USE_GOOGLE_KMS=true
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./kms-service-account.json
GOOGLE_KMS_ENCRYPTED_KEY_PATH=./secrets/encrypted-key.enc

# Remove this line:
# COMPANY_PRIVATE_KEY=old_key
```

### 7. Test
```bash
cd apps/api
pnpm dev
```

You should see: `✅ Retrieved private key from Google KMS`

## Troubleshooting

**"Permission denied"**

**For Linux/Mac (Bash):**
```bash
# Grant decrypt permission
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT="kms-service-account@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud kms keys add-iam-policy-binding company-private-key \
    --keyring=beehive-keyring \
    --location=global \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/cloudkms.cryptoKeyDecrypter"
```

**For Windows (PowerShell):**
```powershell
# Grant decrypt permission
$PROJECT_ID = gcloud config get-value project
$SERVICE_ACCOUNT = "kms-service-account@$PROJECT_ID.iam.gserviceaccount.com"
gcloud kms keys add-iam-policy-binding company-private-key `
    --keyring=beehive-keyring `
    --location=global `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/cloudkms.cryptoKeyDecrypter"

# Also grant encrypt permission if you need to encrypt keys
gcloud kms keys add-iam-policy-binding company-private-key `
    --keyring=beehive-keyring `
    --location=global `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/cloudkms.cryptoKeyEncrypter"
```

**"Key not found"**
- Verify key ring exists: `gcloud kms keyrings list --location=global`
- Verify key exists: `gcloud kms keys list --keyring=beehive-keyring --location=global`

## File Locations

- Service Account Key: `kms-service-account.json` (project root)
- Encrypted Key: `secrets/encrypted-key.enc` (project root)
- Both are already in `.gitignore` ✅

## Security Checklist

- ✅ Service account key file is not in git
- ✅ Encrypted key file is not in git
- ✅ Old `COMPANY_PRIVATE_KEY` removed from `.env`
- ✅ Service account has minimal permissions (only decrypt)
- ✅ Encrypted key stored securely on server

