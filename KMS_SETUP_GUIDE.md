# Google KMS Setup Guide for Private Key Encryption

This guide will help you securely encrypt and store your new company wallet private key using Google Cloud KMS.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud SDK (gcloud)** installed
3. **Node.js** installed (for the encryption script)
4. **New Private Key** ready to encrypt

## Step 1: Install Google Cloud SDK

If you haven't already:

```bash
# Windows (using PowerShell)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe

# Or download from: https://cloud.google.com/sdk/docs/install
```

## Step 2: Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your Google Cloud project ID.

## Step 3: Enable KMS API

```bash
gcloud services enable cloudkms.googleapis.com
```

## Step 4: Create a Key Ring

```bash
# Set your location (choose one: global, us-east1, us-west1, etc.)
LOCATION="global"
KEY_RING="beehive-keyring"

gcloud kms keyrings create $KEY_RING \
    --location=$LOCATION
```

## Step 5: Create an Encryption Key

```bash
KEY_NAME="company-private-key"

gcloud kms keys create $KEY_NAME \
    --keyring=$KEY_RING \
    --location=$LOCATION \
    --purpose=encryption
```

## Step 6: Create a Service Account

```bash
SERVICE_ACCOUNT_NAME="kms-service-account"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="KMS Service Account for Beehive"

# Grant decrypt permission
gcloud kms keys add-iam-policy-binding $KEY_NAME \
    --location=$LOCATION \
    --keyring=$KEY_RING \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/cloudkms.cryptoKeyDecrypter"
```

## Step 7: Create and Download Service Account Key

```bash
# Create key file
gcloud iam service-accounts keys create kms-service-account.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

# Move to project root
# Windows PowerShell:
Move-Item kms-service-account.json ..\..\..\kms-service-account.json

# Linux/Mac:
# mv kms-service-account.json ../../../kms-service-account.json
```

## Step 8: Encrypt Your Private Key

Use the provided script (see `encrypt-private-key.js`):

```bash
node encrypt-private-key.js
```

Or manually:

```bash
# Set your private key (WITHOUT 0x prefix for encryption)
PRIVATE_KEY="your_new_private_key_without_0x"

# Encrypt using gcloud
echo -n "$PRIVATE_KEY" | gcloud kms encrypt \
    --plaintext-file=- \
    --ciphertext-file=encrypted-key.enc \
    --key=$KEY_NAME \
    --keyring=$KEY_RING \
    --location=$LOCATION
```

**Windows PowerShell alternative:**
```powershell
$PRIVATE_KEY = "your_new_private_key_without_0x"
$PRIVATE_KEY | Out-File -Encoding utf8 -NoNewline temp-key.txt
gcloud kms encrypt --plaintext-file=temp-key.txt --ciphertext-file=encrypted-key.enc --key=$KEY_NAME --keyring=$KEY_RING --location=$LOCATION
Remove-Item temp-key.txt
```

## Step 9: Store Encrypted Key Securely

```bash
# Create secrets directory
mkdir -p secrets

# Move encrypted key
# Windows PowerShell:
Move-Item encrypted-key.enc secrets\encrypted-key.enc

# Linux/Mac:
# mv encrypted-key.enc secrets/encrypted-key.enc

# Set proper permissions (Linux/Mac)
# chmod 600 secrets/encrypted-key.enc
```

## Step 10: Update Environment Variables

Add these to your `.env` file:

```env
# Enable Google KMS
USE_GOOGLE_KMS=true

# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# KMS Configuration (optional - defaults shown)
GOOGLE_KMS_LOCATION=global
GOOGLE_KMS_KEY_RING=beehive-keyring
GOOGLE_KMS_KEY_NAME=company-private-key

# Service Account Key File Path
GOOGLE_APPLICATION_CREDENTIALS=./kms-service-account.json

# Encrypted Key File Path (optional - default shown)
GOOGLE_KMS_ENCRYPTED_KEY_PATH=./secrets/encrypted-key.enc

# Remove or comment out the old plaintext key
# COMPANY_PRIVATE_KEY=old_key_here
```

## Step 11: Test the Setup

Run your API and check the logs:

```bash
cd apps/api
pnpm dev
```

You should see:
```
✅ KMSService initialized successfully
✅ Retrieved private key from Google KMS
```

## Security Best Practices

1. **Never commit** `kms-service-account.json` or `encrypted-key.enc` to git
2. Add to `.gitignore`:
   ```
   kms-service-account.json
   secrets/
   *.enc
   ```
3. **Store service account key securely** on your server
4. **Use IAM roles** to limit service account permissions
5. **Rotate keys** periodically
6. **Monitor KMS usage** in Google Cloud Console

## Troubleshooting

### Error: "Permission denied"
- Check service account has `cloudkms.cryptoKeyDecrypter` role
- Verify service account key file path

### Error: "Key not found"
- Verify key ring and key name match your configuration
- Check location (global, us-east1, etc.)

### Error: "Invalid ciphertext"
- Ensure you're using the correct key for decryption
- Verify encrypted file wasn't corrupted

## Verification Commands

```bash
# List key rings
gcloud kms keyrings list --location=global

# List keys in key ring
gcloud kms keys list --keyring=beehive-keyring --location=global

# Test decryption (manual)
gcloud kms decrypt \
    --ciphertext-file=secrets/encrypted-key.enc \
    --plaintext-file=decrypted-test.txt \
    --key=company-private-key \
    --keyring=beehive-keyring \
    --location=global

# View decrypted content (verify it matches your private key)
cat decrypted-test.txt

# Delete test file
rm decrypted-test.txt
```

## Next Steps

1. ✅ Remove old private key from `.env`
2. ✅ Test API with new KMS setup
3. ✅ Update production environment variables
4. ✅ Monitor for any unauthorized transactions
5. ✅ Set up alerts in Google Cloud Console

