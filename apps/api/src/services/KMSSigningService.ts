// ============================================
// GOOGLE KMS SIGNING SERVICE
// Signs blockchain transactions using Google KMS
// 
// NOTE: This service is prepared for true KMS signing (asymmetric key),
// but currently the worker uses KMSService to decrypt the key and sign locally.
// 
// For true KMS signing, you need:
// 1. An asymmetric signing key in Google KMS (not encryption key)
// 2. Signature format conversion (r, s, v for Ethereum)
// 3. EIP-155 transaction signing support
// 
// Current implementation: Decrypts key from KMS, signs locally (still secure)
// ============================================

import { KeyManagementServiceClient } from "@google-cloud/kms";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to get environment variables
function getEnvVar(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}

export interface SignTransactionRequest {
  messageHash: string; // Transaction hash to sign (0x...)
}

export interface SignTransactionResponse {
  signature: string; // R|S signature (0x...)
  publicKey?: string; // Public key (optional, for verification)
}

export class KMSSigningService {
  private client: KeyManagementServiceClient | null = null;
  private initialized: boolean = false;
  private keyResourceName: string | null = null;

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

      console.log("🔍 KMSSigningService initializing...");
      console.log("🔍 Service account path:", serviceAccountPath);

      // Initialize KMS client
      this.client = new KeyManagementServiceClient({
        keyFilename: serviceAccountPath,
      });

      // Get KMS configuration
      const projectId = getEnvVar("GOOGLE_CLOUD_PROJECT_ID");
      const location = getEnvVar("GOOGLE_KMS_LOCATION", "global");
      const keyRing = getEnvVar("GOOGLE_KMS_KEY_RING", "beehive-keyring");
      const keyName = getEnvVar("GOOGLE_KMS_SIGNING_KEY_NAME", "company-signing-key");

      if (!projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT_ID environment variable is required");
      }

      // Build key resource name for signing
      this.keyResourceName = this.client.cryptoKeyPath(
        projectId,
        location,
        keyRing,
        keyName
      );

      console.log("✅ KMSSigningService initialized successfully");
      console.log("   Key resource:", this.keyResourceName);
    } catch (error) {
      console.error("❌ Failed to initialize KMS signing service:", error);
      throw error;
    }
  }

  /**
   * Sign a transaction hash using Google KMS
   * 
   * @param messageHash - The transaction hash to sign (0x...)
   * @returns Signature in R|S format (0x...)
   */
  async signTransaction(messageHash: string): Promise<SignTransactionResponse> {
    await this.initialize();

    if (!this.client || !this.keyResourceName) {
      throw new Error("KMS signing service not initialized");
    }

    try {
      // Remove 0x prefix if present for KMS (KMS expects raw bytes)
      const hashBytes = messageHash.startsWith("0x")
        ? Buffer.from(messageHash.slice(2), "hex")
        : Buffer.from(messageHash, "hex");

      console.log("🔍 Signing transaction hash with KMS...");

      // Sign using KMS
      const [signResponse] = await this.client.asymmetricSign({
        name: this.keyResourceName,
        digest: {
          sha256: hashBytes,
        },
      });

      if (!signResponse.signature) {
        throw new Error("KMS returned empty signature");
      }

      // Convert signature to hex string
      const signature = `0x${signResponse.signature.toString("hex")}`;

      console.log("✅ Transaction signed successfully by KMS");

      return {
        signature,
      };
    } catch (error: any) {
      console.error("❌ Failed to sign transaction with KMS:", error);
      throw new Error(`KMS signing failed: ${error.message}`);
    }
  }

  /**
   * Get public key from KMS (for verification)
   */
  async getPublicKey(): Promise<string> {
    await this.initialize();

    if (!this.client || !this.keyResourceName) {
      throw new Error("KMS signing service not initialized");
    }

    try {
      const [publicKeyResponse] = await this.client.getPublicKey({
        name: this.keyResourceName,
      });

      if (!publicKeyResponse.pem) {
        throw new Error("KMS returned empty public key");
      }

      return publicKeyResponse.pem;
    } catch (error: any) {
      console.error("❌ Failed to get public key from KMS:", error);
      throw new Error(`Failed to get public key: ${error.message}`);
    }
  }
}

// Export singleton instance
export const kmsSigningService = new KMSSigningService();

