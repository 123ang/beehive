// ============================================
// GOOGLE CLOUD KMS SERVICE
// Securely retrieves private key from Google KMS
// ============================================

import { KeyManagementServiceClient } from "@google-cloud/kms";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      // Default to project root/kms-service-account.json
      // From apps/api/src/services, go up 4 levels to project root
      // Works in both dev (src/) and production (dist/)
      const defaultServiceAccountPath = resolve(__dirname, "../../../../kms-service-account.json");
      const serviceAccountPath = getEnvVar(
        "GOOGLE_APPLICATION_CREDENTIALS",
        defaultServiceAccountPath
      );

      console.log("🔍 KMSService initializing...");
      console.log("🔍 Service account path:", serviceAccountPath);

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
      const location = getEnvVar("GOOGLE_KMS_LOCATION", "global");
      const keyRing = getEnvVar("GOOGLE_KMS_KEY_RING", "beehive-keyring");
      const keyName = getEnvVar("GOOGLE_KMS_KEY_NAME", "company-private-key");

      if (!projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT_ID environment variable is required");
      }

      console.log("🔍 KMS Configuration:");
      console.log("   Project ID:", projectId);
      console.log("   Location:", location);
      console.log("   Key Ring:", keyRing);
      console.log("   Key Name:", keyName);

      // Get encrypted key file path
      // Calculate project root: from apps/api/src/services or apps/api/dist/services
      // Structure: root -> apps -> api -> src/dist -> services
      // So we need to go up 4 levels to get to root
      const projectRoot = resolve(__dirname, "../../../../");
      const defaultEncryptedKeyPath = resolve(projectRoot, "secrets/encrypted-key.enc");
      
      // Check if env var is set (might be pointing to wrong location)
      const envPath = getEnvVar("GOOGLE_KMS_ENCRYPTED_KEY_PATH", "");
      
      // If env var is set but relative, resolve it from project root
      // If env var is absolute, use it as-is
      let encryptedKeyPath: string;
      if (envPath) {
        if (envPath.startsWith("/") || /^[A-Z]:/.test(envPath)) {
          // Absolute path
          encryptedKeyPath = envPath;
        } else {
          // Relative path - resolve from project root
          encryptedKeyPath = resolve(projectRoot, envPath);
        }
      } else {
        encryptedKeyPath = defaultEncryptedKeyPath;
      }

      console.log("🔍 __dirname:", __dirname);
      console.log("🔍 Project root (calculated):", projectRoot);
      console.log("🔍 process.cwd():", process.cwd());
      console.log("🔍 GOOGLE_KMS_ENCRYPTED_KEY_PATH env var:", envPath || "(not set)");
      console.log("🔍 Encrypted key path (final):", encryptedKeyPath);
      console.log("🔍 File exists:", existsSync(encryptedKeyPath));

      // Read encrypted key file
      const encryptedKey = readFileSync(encryptedKeyPath);

      // Build key resource name
      const keyResourceName = this.client.cryptoKeyPath(
        projectId,
        location,
        keyRing,
        keyName
      );

      console.log("🔍 Decrypting key from KMS...");

      // Decrypt the key
      const [decryptResponse] = await this.client.decrypt({
        name: keyResourceName,
        ciphertext: encryptedKey,
      });

      // Convert decrypted data to string
      if (!decryptResponse.plaintext) {
        throw new Error("Failed to decrypt private key: plaintext is null");
      }
      const privateKey = decryptResponse.plaintext.toString("utf-8").trim();

      // Add 0x prefix if not present
      const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

      console.log("✅ Private key retrieved from KMS (length:", formattedKey.length, "chars)");

      return formattedKey;
    } catch (error: any) {
      console.error("❌ Failed to decrypt private key from KMS:", error);
      throw new Error(`KMS decryption failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const kmsService = new KMSService();

