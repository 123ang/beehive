# Google KMS VPS Deployment Guide

This guide explains how to copy and configure Google KMS files on your VPS server.

## Files to Copy to VPS

You need to copy these files from your local machine to your VPS:

1. **`kms-service-account.json`** - Service account credentials
2. **`secrets/encrypted-key.enc`** - Encrypted private key

## Step 1: Locate Files on Your Local Machine

On your local Windows machine, these files should be at:

```
C:\Users\User\Desktop\Website\beehive\kms-service-account.json
C:\Users\User\Desktop\Website\beehive\secrets\encrypted-key.enc
```

## Step 2: Copy Files to VPS

### Option A: Using SCP (Secure Copy)

**From your local Windows machine (PowerShell or Command Prompt):**

```powershell
# Navigate to project directory
cd C:\Users\User\Desktop\Website\beehive

# Copy service account key
scp kms-service-account.json user@your-vps-ip:/path/to/beehive/

# Create secrets directory on VPS first (via SSH)
# ssh user@your-vps-ip "mkdir -p /path/to/beehive/secrets"

# Copy encrypted key
scp secrets\encrypted-key.enc user@your-vps-ip:/path/to/beehive/secrets/
```

**Replace:**
- `user` - Your VPS username
- `your-vps-ip` - Your VPS IP address or domain
- `/path/to/beehive` - Your project path on VPS (e.g., `/var/www/beehive` or `/home/user/beehive`)

### Option B: Using SFTP Client (WinSCP, FileZilla, etc.)

1. Connect to your VPS using SFTP
2. Navigate to your project directory on VPS
3. Upload `kms-service-account.json` to project root
4. Create `secrets` folder if it doesn't exist
5. Upload `encrypted-key.enc` to `secrets/` folder

### Option C: Using Git (NOT RECOMMENDED - Security Risk)

⚠️ **DO NOT commit these files to git!** They are already in `.gitignore`.

## Step 3: File Locations on VPS

Your VPS directory structure should look like this:

```
/path/to/beehive/
├── kms-service-account.json          ← Service account key (project root)
├── secrets/
│   └── encrypted-key.enc             ← Encrypted private key
├── apps/
│   └── api/
│       ├── .env                      ← Environment variables
│       └── ...
└── ...
```

## Step 4: Set File Permissions on VPS

**SSH into your VPS and run:**

```bash
# Navigate to project directory
cd /path/to/beehive

# Set restrictive permissions on service account key (owner read-only)
chmod 600 kms-service-account.json

# Set restrictive permissions on encrypted key (owner read-only)
chmod 600 secrets/encrypted-key.enc

# Set directory permissions
chmod 700 secrets/

# Verify permissions
ls -la kms-service-account.json
ls -la secrets/encrypted-key.enc
```

**Expected output:**
```
-rw------- 1 user user 1234 Jan 1 12:00 kms-service-account.json
-rw------- 1 user user 5678 Jan 1 12:00 secrets/encrypted-key.enc
```

## Step 5: Update Environment Variables on VPS

**SSH into your VPS and edit the `.env` file:**

```bash
cd /path/to/beehive/apps/api
nano .env
```

**Add or update these variables:**

```env
# Enable Google KMS
USE_GOOGLE_KMS=true

# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=beehive-kms

# Service Account Key File Path (relative to project root)
GOOGLE_APPLICATION_CREDENTIALS=../../kms-service-account.json

# Encrypted Key File Path (relative to project root)
GOOGLE_KMS_ENCRYPTED_KEY_PATH=../../secrets/encrypted-key.enc

# KMS Configuration (optional - defaults shown)
GOOGLE_KMS_LOCATION=global
GOOGLE_KMS_KEY_RING=beehive-keyring
GOOGLE_KMS_KEY_NAME=company-private-key

# Remove or comment out the old plaintext key
# COMPANY_PRIVATE_KEY=old_key_here
```

**Save and exit:**
- `Ctrl + X` (nano)
- `Y` to confirm
- `Enter` to save

## Step 6: Verify File Paths

**Check that paths are correct:**

```bash
cd /path/to/beehive/apps/api

# Check service account file exists
ls -la ../../kms-service-account.json

# Check encrypted key exists
ls -la ../../secrets/encrypted-key.enc
```

**If using absolute paths instead:**

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/beehive/kms-service-account.json
GOOGLE_KMS_ENCRYPTED_KEY_PATH=/path/to/beehive/secrets/encrypted-key.enc
```

## Step 7: Test the Setup

**Restart your API service:**

```bash
# If using PM2
pm2 restart beehive-api

# Or if using systemd
sudo systemctl restart beehive-api

# Or if running manually
cd /path/to/beehive/apps/api
pnpm start
```

**Check the logs:**

```bash
# PM2 logs
pm2 logs beehive-api

# Systemd logs
sudo journalctl -u beehive-api -f

# Manual logs
# Check console output
```

**Look for these success messages:**
```
✅ KMSService initialized successfully
✅ Retrieved private key from Google KMS
```

**If you see errors:**
- Check file paths in `.env`
- Verify file permissions (should be 600)
- Check that files exist at the specified paths
- Verify service account has decrypt permission

## Step 8: Security Checklist

- ✅ `kms-service-account.json` is NOT in git (already in `.gitignore`)
- ✅ `secrets/encrypted-key.enc` is NOT in git (already in `.gitignore`)
- ✅ File permissions set to 600 (owner read-only)
- ✅ Old `COMPANY_PRIVATE_KEY` removed from `.env`
- ✅ Service account has minimal permissions (only decrypt)
- ✅ Files are stored securely on VPS
- ✅ Backup of encrypted key stored securely (offline)

## Troubleshooting

### Error: "Service account file not found"
- Check `GOOGLE_APPLICATION_CREDENTIALS` path in `.env`
- Verify file exists: `ls -la /path/to/kms-service-account.json`
- Use absolute path if relative path doesn't work

### Error: "Encrypted key file not found"
- Check `GOOGLE_KMS_ENCRYPTED_KEY_PATH` path in `.env`
- Verify file exists: `ls -la /path/to/secrets/encrypted-key.enc`
- Ensure `secrets/` directory exists

### Error: "Permission denied"
- Check file permissions: `chmod 600 kms-service-account.json`
- Check directory permissions: `chmod 700 secrets/`
- Verify service account has `cloudkms.cryptoKeyDecrypter` role

### Error: "KMS decryption failed"
- Verify service account key is valid
- Check Google Cloud project ID is correct
- Verify key ring and key name match your setup
- Check service account has decrypt permission

## Quick Reference: File Locations

| File | Local Path | VPS Path |
|------|-----------|----------|
| Service Account Key | `C:\Users\User\Desktop\Website\beehive\kms-service-account.json` | `/path/to/beehive/kms-service-account.json` |
| Encrypted Key | `C:\Users\User\Desktop\Website\beehive\secrets\encrypted-key.enc` | `/path/to/beehive/secrets/encrypted-key.enc` |
| Environment File | `C:\Users\User\Desktop\Website\beehive\apps\api\.env` | `/path/to/beehive/apps/api/.env` |

## Example: Complete Deployment Commands

**On your local Windows machine:**

```powershell
# Set your VPS details
$VPS_USER = "your-username"
$VPS_IP = "your-vps-ip-or-domain"
$VPS_PATH = "/var/www/beehive"  # or your actual path

# Copy files
scp kms-service-account.json ${VPS_USER}@${VPS_IP}:${VPS_PATH}/
scp secrets\encrypted-key.enc ${VPS_USER}@${VPS_IP}:${VPS_PATH}/secrets/
```

**On your VPS (via SSH):**

```bash
# Navigate to project
cd /var/www/beehive  # or your path

# Set permissions
chmod 600 kms-service-account.json
chmod 600 secrets/encrypted-key.enc
chmod 700 secrets/

# Edit environment file
cd apps/api
nano .env
# (Add the KMS environment variables as shown above)

# Restart service
pm2 restart beehive-api
# or
sudo systemctl restart beehive-api
```

## Next Steps

1. ✅ Files copied to VPS
2. ✅ Permissions set correctly
3. ✅ Environment variables updated
4. ✅ Service restarted
5. ✅ Logs checked for success messages
6. ✅ Test API endpoints to verify KMS is working

Your private key is now securely encrypted and stored on your VPS! 🔐

