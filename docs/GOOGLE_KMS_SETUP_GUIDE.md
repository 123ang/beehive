# 🔐 Google Cloud KMS Setup Guide

## Overview

This guide shows you how to use Google Cloud Key Management Service (KMS) to securely store and retrieve your private key instead of storing it in `.env` files.

---

## 🎯 Why Use Google KMS?

### Security Benefits:
- ✅ **No private keys in code or environment files**
- ✅ **Encrypted at rest and in transit**
- ✅ **Access control via IAM**
- ✅ **Audit logging of key access**
- ✅ **Key rotation support**
- ✅ **Hardware Security Module (HSM) support**

### Before (`.env` file):
```env
COMPANY_PRIVATE_KEY=041f802d146c228ec2adef8b6241a40222ddb8ef3e76f1a723594e977fec9987
```
❌ **Risk:** Private key stored in plain text, visible in logs, version control, backups

### After (Google KMS):
```typescript
const privateKey = await kmsService.getPrivateKey();
```
✅ **Secure:** Private key encrypted, only accessible via authenticated API calls

---

## 📋 Prerequisites

1. **Google Cloud Account**
   - Sign up at https://cloud.google.com
   - Enable billing (KMS has free tier: 20,000 operations/month)

2. **Google Cloud SDK (gcloud)**
   ```bash
   # Install gcloud CLI
   # Windows: Download from https://cloud.google.com/sdk/docs/install
   # Or use: winget install Google.CloudSDK
   ```

3. **Node.js Package**
   ```bash
   cd apps/api
   pnpm add @google-cloud/kms
   ```

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create beehive-kms --name="Beehive KMS"

# Set as active project
gcloud config set project beehive-kms

# Enable KMS API
gcloud services enable cloudkms.googleapis.com
```

### Step 2: Create Key Ring

A key ring is a logical grouping of keys in a specific location.

```bash
# Create key ring (choose location: us, asia, europe)
gcloud kms keyrings create beehive-keyring \
  --location=asia \
  --project=beehive-kms
```

**Available Locations:**
- `us` - United States
- `asia` - Asia Pacific
- `europe` - Europe
- `global` - Global (not recommended for production)

### Step 3: Create Crypto Key

```bash
# Create a crypto key for storing private key
gcloud kms keys create company-private-key \
  --keyring=beehive-keyring \
  --location=us \
  --purpose=encryption \
  --project=beehive-kms
```

**Key Types:**
- `encryption` - For encrypting/decrypting data (what we need)
- `asymmetric-signing` - For signing operations
- `asymmetric-decryption` - For asymmetric encryption

### Step 4: Create Service Account

```bash
# Create service account for your application
gcloud iam service-accounts create beehive-kms-service \
  --display-name="Beehive KMS Service Account" \
  --project=beehive-kms

# Grant permission to decrypt
gcloud kms keys add-iam-policy-binding company-private-key \
  --location=us \
  --keyring=beehive-keyring \
  --member="serviceAccount:beehive-kms-service@beehive-kms.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyDecrypter" \
  --project=beehive-kms
```

### Step 5: Create and Download Service Account Key

```bash
# Create service account key file
gcloud iam service-accounts keys create kms-service-account.json \
  --iam-account=beehive-kms-service@beehive-kms.iam.gserviceaccount.com \
  --project=beehive-kms

# Move to secure location (DO NOT commit to git!)
# Windows:
move kms-service-account.json C:\secure\kms-service-account.json

# Linux/Mac:
mv kms-service-account.json ~/.secure/kms-service-account.json
```

**⚠️ IMPORTANT:** 
- Never commit `kms-service-account.json` to git
- Add to `.gitignore`
- Restrict file permissions (chmod 600)

### Step 6: Encrypt Your Private Key

```bash
# Encrypt your private key using KMS
echo "041f802d146c228ec2adef8b6241a40222ddb8ef3e76f1a723594e977fec9987" | \
  gcloud kms encrypt \
    --plaintext-file=- \
    --ciphertext-file=encrypted-key.enc \
    --key=company-private-key \
    --keyring=beehive-keyring \
    --location=us \
    --project=beehive-kms
```

**Alternative (PowerShell):**
```powershell
# Encrypt private key
"041f802d146c228ec2adef8b6241a40222ddb8ef3e76f1a723594e977fec9987" | \
  gcloud kms encrypt `
    --plaintext-file=- `
    --ciphertext-file=encrypted-key.enc `
    --key=company-private-key `
    --keyring=beehive-keyring `
    --location=us `
    --project=beehive-kms
```

### Step 7: Store Encrypted Key

Store the encrypted key file (`encrypted-key.enc`) in a secure location:

```bash
# Move encrypted key to your project (but NOT in git)
# Windows:
move encrypted-key.enc apps\api\secrets\encrypted-key.enc

# Linux/Mac:
mv encrypted-key.enc apps/api/secrets/encrypted-key.enc
```

**⚠️ IMPORTANT:**
- The encrypted file can be stored in your project (it's safe)
- Add `apps/api/secrets/` to `.gitignore`
- The encrypted file is useless without KMS access

---

## 💻 Code Implementation

### Step 1: Install Dependencies

```bash
cd apps/api
pnpm add @google-cloud/kms
```

### Step 2: Create KMS Service

Create `apps/api/src/services/KMSService.ts`:

```typescript
// ============================================
// GOOGLE CLOUD KMS SERVICE
// Securely retrieves private key from Google KMS
// ============================================

import { KeyManagementServiceClient } from "@google-cloud/kms";
import { readFileSync } from "fs";
import { resolve } from "path";

// Helper to get environment variables
function getEnvVar(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}

export class KMSService {
  private client: KeyManagementServiceClient | null = null;
  private initialized: boolean = false;

  constructor() {
    // Lazy initialization
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      // Get service account key file path
      const serviceAccountPath = getEnvVar(
        "GOOGLE_APPLICATION_CREDENTIALS",
        resolve(__dirname, "../../../kms-service-account.json")
      );

      // Initialize KMS client
      this.client = new KeyManagementServiceClient({
        keyFilename: serviceAccountPath,
      });

      this.initialized = true;
      console.log("✅ KMSService initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize KMS service:", error);
      throw error;
    }
  }

  /**
   * Decrypt and retrieve private key from KMS
   */
  async getPrivateKey(): Promise<string> {
    await this.initialize();

    if (!this.client) {
      throw new Error("KMS client not initialized");
    }

    try {
      // Get KMS configuration from environment
      const projectId = getEnvVar("GOOGLE_CLOUD_PROJECT_ID");
      const location = getEnvVar("GOOGLE_KMS_LOCATION", "us");
      const keyRing = getEnvVar("GOOGLE_KMS_KEY_RING", "beehive-keyring");
      const keyName = getEnvVar("GOOGLE_KMS_KEY_NAME", "company-private-key");

      if (!projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT_ID environment variable is required");
      }

      // Get encrypted key file path
      const encryptedKeyPath = getEnvVar(
        "GOOGLE_KMS_ENCRYPTED_KEY_PATH",
        resolve(__dirname, "../../../secrets/encrypted-key.enc")
      );

      // Read encrypted key file
      const encryptedKey = readFileSync(encryptedKeyPath);

      // Build key resource name
      const keyResourceName = this.client.cryptoKeyPath(
        projectId,
        location,
        keyRing,
        keyName
      );

      // Decrypt the key
      const [decryptResponse] = await this.client.decrypt({
        name: keyResourceName,
        ciphertext: encryptedKey,
      });

      // Convert decrypted data to string
      const privateKey = decryptResponse.plaintext.toString("utf-8").trim();

      // Add 0x prefix if not present
      return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    } catch (error: any) {
      console.error("❌ Failed to decrypt private key from KMS:", error);
      throw new Error(`KMS decryption failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const kmsService = new KMSService();
```

### Step 3: Update BlockchainService

Update `apps/api/src/services/BlockchainService.ts`:

```typescript
// Add import at top
import { kmsService } from "./KMSService";

// In the initialize() method, replace:
const COMPANY_PRIVATE_KEY = getEnvVar("COMPANY_PRIVATE_KEY");

// With:
let COMPANY_PRIVATE_KEY: string;
try {
  // Try to get from KMS first
  if (process.env.USE_GOOGLE_KMS === "true") {
    COMPANY_PRIVATE_KEY = await kmsService.getPrivateKey();
    console.log("✅ Retrieved private key from Google KMS");
  } else {
    // Fallback to .env for backward compatibility
    COMPANY_PRIVATE_KEY = getEnvVar("COMPANY_PRIVATE_KEY");
    if (!COMPANY_PRIVATE_KEY) {
      throw new Error("COMPANY_PRIVATE_KEY not set and USE_GOOGLE_KMS is false");
    }
    console.log("⚠️ Using private key from .env (consider using Google KMS)");
  }
} catch (error: any) {
  console.error("❌ Failed to get private key:", error);
  throw error;
}
```

---

## 🔧 Environment Configuration

### Update `.env` file:

```env
# Google Cloud KMS Configuration
USE_GOOGLE_KMS=true
GOOGLE_CLOUD_PROJECT_ID=beehive-kms
GOOGLE_KMS_LOCATION=us
GOOGLE_KMS_KEY_RING=beehive-keyring
GOOGLE_KMS_KEY_NAME=company-private-key
GOOGLE_APPLICATION_CREDENTIALS=C:\secure\kms-service-account.json
GOOGLE_KMS_ENCRYPTED_KEY_PATH=apps\api\secrets\encrypted-key.enc

# Remove or comment out the old private key
# COMPANY_PRIVATE_KEY=041f802d146c228ec2adef8b6241a40222ddb8ef3e76f1a723594e977fec9987
```

### Update `.gitignore`:

```gitignore
# Google KMS files
kms-service-account.json
**/kms-service-account.json
encrypted-key.enc
apps/api/secrets/
secrets/
```

---

## 🚀 Deployment

### Local Development:

1. Place `kms-service-account.json` in secure location
2. Place `encrypted-key.enc` in `apps/api/secrets/`
3. Set environment variables in `.env`
4. Run application

### Production (Cloud Run / App Engine):

1. **Store service account key in Secret Manager:**
   ```bash
   gcloud secrets create kms-service-account \
     --data-file=kms-service-account.json \
     --project=beehive-kms
   ```

2. **Store encrypted key in Secret Manager:**
   ```bash
   gcloud secrets create encrypted-private-key \
     --data-file=encrypted-key.enc \
     --project=beehive-kms
   ```

3. **Grant access to service:**
   ```bash
   gcloud secrets add-iam-policy-binding kms-service-account \
     --member="serviceAccount:your-service@project.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

4. **Update code to read from Secret Manager:**
   ```typescript
   import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
   
   const client = new SecretManagerServiceClient();
   const [version] = await client.accessSecretVersion({
     name: "projects/beehive-kms/secrets/kms-service-account/versions/latest",
   });
   const serviceAccount = JSON.parse(version.payload.data.toString());
   ```

### Production (Other Platforms):

For non-Google Cloud platforms (AWS, Azure, etc.):

1. Store `kms-service-account.json` in platform's secret manager
2. Store `encrypted-key.enc` in platform's secret manager
3. Load secrets at runtime
4. Use Google KMS API from anywhere (not limited to GCP)

---

## 🔄 Key Rotation

To rotate your private key:

1. **Generate new private key**
2. **Encrypt new key:**
   ```bash
   echo "NEW_PRIVATE_KEY" | gcloud kms encrypt \
     --plaintext-file=- \
     --ciphertext-file=new-encrypted-key.enc \
     --key=company-private-key \
     --keyring=beehive-keyring \
     --location=us
   ```

3. **Update encrypted key file**
4. **Restart application**

---

## 📊 Cost Estimation

**Google KMS Pricing:**
- **Free Tier:** 20,000 operations/month
- **After Free Tier:** $0.06 per 10,000 operations
- **Key Storage:** $0.06 per key per month

**Example:**
- 1,000 decryptions/day = 30,000/month
- Cost: ~$0.06/month (after free tier)
- Very affordable for most applications

---

## 🔒 Security Best Practices

1. ✅ **Use least privilege IAM roles**
2. ✅ **Enable audit logging**
3. ✅ **Rotate keys regularly**
4. ✅ **Use separate keys for dev/prod**
5. ✅ **Never log decrypted keys**
6. ✅ **Monitor KMS access logs**
7. ✅ **Use HSM keys for production** (optional, more secure)

---

## 🧪 Testing

### Test KMS Connection:

```typescript
import { kmsService } from "./services/KMSService";

async function testKMS() {
  try {
    const privateKey = await kmsService.getPrivateKey();
    console.log("✅ KMS working! Private key retrieved (length:", privateKey.length, ")");
    // Don't log the actual key!
  } catch (error) {
    console.error("❌ KMS test failed:", error);
  }
}

testKMS();
```

---

## 🆘 Troubleshooting

### Error: "Permission denied"
- Check service account has `roles/cloudkms.cryptoKeyDecrypter` role
- Verify service account key file path is correct

### Error: "Key not found"
- Verify project ID, location, key ring, and key name
- Check key exists: `gcloud kms keys list --keyring=beehive-keyring --location=us`

### Error: "Invalid encrypted key"
- Re-encrypt the key using the correct key
- Verify encrypted key file path is correct

### Error: "Authentication failed"
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account key
- Check service account key file is valid JSON

---

## 📝 Summary

**Benefits:**
- ✅ Private key never stored in plain text
- ✅ Encrypted at rest and in transit
- ✅ Access controlled via IAM
- ✅ Audit logging enabled
- ✅ Key rotation support

**Next Steps:**
1. Set up Google Cloud KMS
2. Encrypt your private key
3. Install `@google-cloud/kms` package
4. Implement KMSService
5. Update BlockchainService
6. Test and deploy

**Last Updated:** $(date)

