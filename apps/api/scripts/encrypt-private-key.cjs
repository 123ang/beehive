#!/usr/bin/env node

/**
 * Script to encrypt private key using Google Cloud KMS (CommonJS version)
 * 
 * Usage:
 *   node encrypt-private-key.cjs
 * 
 * Or with environment variables:
 *   GOOGLE_CLOUD_PROJECT_ID=your-project \
 *   GOOGLE_KMS_LOCATION=global \
 *   GOOGLE_KMS_KEY_RING=beehive-keyring \
 *   GOOGLE_KMS_KEY_NAME=company-private-key \
 *   node encrypt-private-key.cjs
 */

const { KeyManagementServiceClient } = require("@google-cloud/kms");
const { writeFileSync, readFileSync, existsSync, mkdirSync } = require("fs");
const { resolve, dirname } = require("path");
const readline = require("readline");

// Get script directory
// In CommonJS, __dirname and __filename are available as globals
// But when package.json has "type": "module", .cjs files still use CommonJS
// We'll use require.resolve to get the script path
const scriptPath = require.resolve("./encrypt-private-key.cjs");
const scriptDir = dirname(scriptPath);

// Get environment variables
function getEnvVar(key, defaultValue = "") {
  return process.env[key] || defaultValue;
}

// Create readline interface for secure input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("🔐 Google KMS Private Key Encryption Tool");
  console.log("==========================================\n");

  // Get configuration
  const projectId = getEnvVar("GOOGLE_CLOUD_PROJECT_ID") || await question("Enter Google Cloud Project ID: ");
  const location = getEnvVar("GOOGLE_KMS_LOCATION", "global");
  const keyRing = getEnvVar("GOOGLE_KMS_KEY_RING", "beehive-keyring");
  const keyName = getEnvVar("GOOGLE_KMS_KEY_NAME", "company-private-key");

  console.log("\n📋 Configuration:");
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Location: ${location}`);
  console.log(`   Key Ring: ${keyRing}`);
  console.log(`   Key Name: ${keyName}\n`);

  // Get service account path
  const serviceAccountPath = getEnvVar(
    "GOOGLE_APPLICATION_CREDENTIALS",
    resolve(scriptDir, "../../../kms-service-account.json")
  );

  if (!existsSync(serviceAccountPath)) {
    console.error(`❌ Service account file not found: ${serviceAccountPath}`);
    console.error("   Please create a service account key first (see KMS_SETUP_GUIDE.md)");
    process.exit(1);
  }

  // Initialize KMS client
  console.log("🔍 Initializing KMS client...");
  const client = new KeyManagementServiceClient({
    keyFilename: serviceAccountPath,
  });

  // Get private key
  console.log("\n🔑 Enter your private key:");
  console.log("   (It will be hidden for security)");
  const privateKey = await question("Private key (with or without 0x prefix): ");

  // Remove 0x prefix if present (we'll add it back when decrypting)
  const cleanKey = privateKey.trim().replace(/^0x/, "");

  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    console.error("❌ Invalid private key format. Should be 64 hex characters.");
    process.exit(1);
  }

  // Build key resource name
  const keyResourceName = client.cryptoKeyPath(projectId, location, keyRing, keyName);

  console.log("\n🔐 Encrypting private key...");

  try {
    // Encrypt the key
    const [encryptResponse] = await client.encrypt({
      name: keyResourceName,
      plaintext: Buffer.from(cleanKey, "utf-8"),
    });

    // Get output path
    const outputPath = getEnvVar(
      "GOOGLE_KMS_ENCRYPTED_KEY_PATH",
      resolve(scriptDir, "../../../secrets/encrypted-key.enc")
    );

    // Create secrets directory if it doesn't exist
    const secretsDir = resolve(outputPath, "..");
    if (!existsSync(secretsDir)) {
      mkdirSync(secretsDir, { recursive: true });
      console.log(`📁 Created directory: ${secretsDir}`);
    }

    // Write encrypted key to file
    writeFileSync(outputPath, encryptResponse.ciphertext);

    console.log("✅ Encryption successful!");
    console.log(`\n📄 Encrypted key saved to: ${outputPath}`);
    console.log("\n⚠️  IMPORTANT:");
    console.log("   1. Delete the plaintext private key from your terminal history");
    console.log("   2. Add the encrypted key file to .gitignore");
    console.log("   3. Update your .env file with KMS configuration");
    console.log("   4. Remove COMPANY_PRIVATE_KEY from .env");
    console.log("\n📖 See KMS_SETUP_GUIDE.md for next steps\n");

    // Verify encryption (optional)
    const verify = await question("Would you like to verify the encryption? (y/N): ");
    if (verify.toLowerCase() === "y") {
      console.log("\n🔍 Verifying encryption...");
      const encryptedKey = readFileSync(outputPath);
      const [decryptResponse] = await client.decrypt({
        name: keyResourceName,
        ciphertext: encryptedKey,
      });
      const decrypted = decryptResponse.plaintext.toString("utf-8");
      if (decrypted === cleanKey) {
        console.log("✅ Verification successful! Encrypted key can be decrypted correctly.");
      } else {
        console.error("❌ Verification failed! Decrypted key doesn't match.");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("\n❌ Encryption failed:", error.message);
    if (error.message.includes("Permission denied") || error.message.includes("PERMISSION_DENIED")) {
      console.error("\n💡 The service account needs ENCRYPT permission!");
      console.error("\n   Run this command to grant encrypt permission:");
      console.error(`\n   gcloud kms keys add-iam-policy-binding ${keyName} \\`);
      console.error(`       --keyring=${keyRing} \\`);
      console.error(`       --location=${location} \\`);
      console.error(`       --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \\`);
      console.error(`       --role="roles/cloudkms.cryptoKeyEncrypter"`);
      console.error("\n   To find your service account email, check kms-service-account.json");
      console.error("   It's in the 'client_email' field.");
      console.error("\n   Or run this (replace PROJECT_ID):");
      console.error(`   gcloud kms keys add-iam-policy-binding ${keyName} \\`);
      console.error(`       --keyring=${keyRing} \\`);
      console.error(`       --location=${location} \\`);
      console.error(`       --member="serviceAccount:kms-service-account@PROJECT_ID.iam.gserviceaccount.com" \\`);
      console.error(`       --role="roles/cloudkms.cryptoKeyEncrypter"`);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

