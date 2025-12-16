// ============================================
// BLOCKCHAIN SERVICE
// Handles blockchain transactions (transfers from company account)
// ============================================

import { createWalletClient, createPublicClient, http, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, bscTestnet } from "viem/chains";

// Note: .env file is already loaded by index.ts before this service is imported
// Environment variables are available via process.env

// ERC20 ABI for transfer function
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// Helper function to get environment variables
function getEnvVar(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}

// Select chain based on environment
function getChain() {
  const chainId = parseInt(getEnvVar("BSC_CHAIN_ID", "56"));
  return chainId === 97 ? bscTestnet : bsc;
}

export class BlockchainService {
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private publicClient: ReturnType<typeof createPublicClient> | null = null;
  private account: ReturnType<typeof privateKeyToAccount> | null = null;
  private chain: typeof bsc | typeof bscTestnet = bsc;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize here - wait until first use
  }

  private async initialize() {
    if (this.initialized) return;

    console.log("🔍 BlockchainService initializing...");

    // Try to get private key from KMS or .env
    let COMPANY_PRIVATE_KEY: string | null = null;

    try {
      if (getEnvVar("USE_GOOGLE_KMS") === "true") {
        // Use Google KMS
        console.log("🔍 Attempting to retrieve private key from Google KMS...");
        const { kmsService } = await import("./KMSService");
        COMPANY_PRIVATE_KEY = await kmsService.getPrivateKey();
        console.log("✅ Retrieved private key from Google KMS");
      } else {
        // Fallback to .env for backward compatibility
        COMPANY_PRIVATE_KEY = getEnvVar("COMPANY_PRIVATE_KEY");
        if (COMPANY_PRIVATE_KEY) {
          console.log("⚠️ Using private key from .env (consider using Google KMS for better security)");
          console.log("🔍 COMPANY_PRIVATE_KEY:", `Set (${COMPANY_PRIVATE_KEY.length} chars)`);
        }
      }
    } catch (error: any) {
      console.error("❌ Failed to get private key:", error.message);
      // Try fallback to .env if KMS fails
      if (getEnvVar("USE_GOOGLE_KMS") === "true") {
        console.warn("⚠️ KMS failed, trying fallback to .env...");
        COMPANY_PRIVATE_KEY = getEnvVar("COMPANY_PRIVATE_KEY");
      }
    }
    
    if (!COMPANY_PRIVATE_KEY) {
      console.error("❌ COMPANY_PRIVATE_KEY not available.");
      if (getEnvVar("USE_GOOGLE_KMS") === "true") {
        console.error("   Google KMS is enabled but failed to retrieve key.");
        console.error("   Please check:");
        console.error("   - GOOGLE_APPLICATION_CREDENTIALS points to valid service account key");
        console.error("   - GOOGLE_CLOUD_PROJECT_ID is set");
        console.error("   - GOOGLE_KMS_ENCRYPTED_KEY_PATH points to encrypted key file");
        console.error("   - Service account has cloudkms.cryptoKeyDecrypter role");
      } else {
        console.error("   Please either:");
        console.error("   1. Set USE_GOOGLE_KMS=true and configure Google KMS, or");
        console.error("   2. Add COMPANY_PRIVATE_KEY=your_private_key to your .env file");
      }
      this.initialized = true;
      return;
    }

    try {
      const RPC_URL = getEnvVar("BSC_RPC_URL", "https://bsc-dataseed1.binance.org/");
      this.chain = getChain();

      // Create account from private key (add 0x prefix if not present)
      const privateKey = COMPANY_PRIVATE_KEY.startsWith("0x") 
        ? COMPANY_PRIVATE_KEY 
        : `0x${COMPANY_PRIVATE_KEY}`;
      
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      console.log("🔍 Wallet address derived from private key:", this.account.address);

      // Create public client for reading
      this.publicClient = createPublicClient({
        chain: this.chain,
        transport: http(RPC_URL),
      });

      // Create wallet client for writing
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.chain,
        transport: http(RPC_URL),
      });

      this.initialized = true;
      console.log("✅ BlockchainService initialized successfully");
      console.log("   Chain:", this.chain.name);
      console.log("   RPC:", RPC_URL);
    } catch (error) {
      console.error("❌ Failed to initialize blockchain service:", error);
      this.initialized = true;
    }
  }

  /**
   * Transfer USDT from company account to recipient
   */
  async transferUSDT(to: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    await this.initialize();
    
    if (!this.walletClient || !this.publicClient) {
      return { success: false, error: "Blockchain service not initialized" };
    }

    try {
      const USDT_CONTRACT = getEnvVar("USDT_CONTRACT_ADDRESS", "0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85");
      const COMPANY_ACCOUNT = getEnvVar("COMPANY_ACCOUNT_ADDRESS", "0xba48b5b1f835ebfc5174c982405b3a7a11b655d0");
      
      // Get USDT decimals from env or default to 6
      let usdtDecimals = parseInt(getEnvVar("USDT_DECIMALS", "0"));
      if (usdtDecimals === 0) {
        // Not set in env, try to read from contract
        try {
          const decimals = await this.publicClient.readContract({
            address: USDT_CONTRACT as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals",
          });
          usdtDecimals = Number(decimals);
          console.log("   USDT Token Decimals (from contract):", usdtDecimals);
        } catch (error) {
          console.warn("   Could not read USDT decimals from contract, using default 6");
          usdtDecimals = 6; // Default fallback
        }
      } else {
        console.log("   USDT Token Decimals (from .env):", usdtDecimals);
      }
      
      // Parse amount using actual decimals
      const amountWei = parseUnits(amount.toString(), usdtDecimals);

      // Check company balance
      const balance = await this.publicClient.readContract({
        address: USDT_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [COMPANY_ACCOUNT as `0x${string}`],
      });

      const balanceFormatted = parseFloat(formatUnits(balance, usdtDecimals));
      if (balanceFormatted < amount) {
        return {
          success: false,
          error: `Insufficient USDT balance. Company has ${balanceFormatted} USDT, requested ${amount} USDT`,
        };
      }

      // Execute transfer
      const hash = await this.walletClient.writeContract({
        account: this.account!,
        chain: this.chain,
        address: USDT_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, amountWei],
      });

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        return { success: true, txHash: hash };
      } else {
        return { success: false, error: "Transaction failed" };
      }
    } catch (error: any) {
      console.error("USDT transfer error:", error);
      return {
        success: false,
        error: error.message || "Failed to transfer USDT",
      };
    }
  }

  /**
   * Transfer BCC from company account to recipient
   */
  async transferBCC(to: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    await this.initialize();
    this.initialize();
    
    if (!this.walletClient || !this.publicClient) {
      return { success: false, error: "Blockchain service not initialized" };
    }

    try {
      const BCC_CONTRACT = getEnvVar("BCC_TOKEN_CONTRACT_ADDRESS", "0xe1d791FE419ee701FbC55dd1AA4107bcd5AB7FC8");
      const COMPANY_ACCOUNT = getEnvVar("COMPANY_ACCOUNT_ADDRESS", "0xba48b5b1f835ebfc5174c982405b3a7a11b655d0");
      
      console.log("🔍 BCC Transfer Details:");
      console.log("   BCC Contract:", BCC_CONTRACT);
      console.log("   Company Account:", COMPANY_ACCOUNT);
      console.log("   Requested Amount:", amount, "BCC");
      
      // Get token decimals from env or read from contract
      let bccDecimals = parseInt(getEnvVar("BCC_DECIMALS", "0")); // 0 means not set, will read from contract
      
      if (bccDecimals === 0) {
        // Not set in env, try to read from contract
        try {
          const decimals = await this.publicClient.readContract({
            address: BCC_CONTRACT as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals",
          });
          bccDecimals = Number(decimals);
          console.log("   BCC Token Decimals (from contract):", bccDecimals);
        } catch (error) {
          console.warn("   Could not read decimals from contract, using default 18");
          bccDecimals = 18; // Default fallback
        }
      } else {
        console.log("   BCC Token Decimals (from .env):", bccDecimals);
      }
      
      // Parse amount using actual decimals
      const amountWei = parseUnits(amount.toString(), bccDecimals);

      // Check company balance
      const balance = await this.publicClient.readContract({
        address: BCC_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [COMPANY_ACCOUNT as `0x${string}`],
      });

      const balanceRaw = balance.toString();
      const balanceFormatted = parseFloat(formatUnits(balance, bccDecimals));
      
      console.log("   Balance (raw):", balanceRaw);
      console.log("   Balance (formatted):", balanceFormatted, "BCC");
      
      if (balanceFormatted < amount) {
        return {
          success: false,
          error: `Insufficient BCC balance. Company has ${balanceFormatted} BCC, requested ${amount} BCC. Contract: ${BCC_CONTRACT}`,
        };
      }

      // Use the same decimals for transfer
      const transferAmountWei = parseUnits(amount.toString(), bccDecimals);
      
      // Execute transfer
      const hash = await this.walletClient.writeContract({
        account: this.account!,
        chain: this.chain,
        address: BCC_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, transferAmountWei],
      });

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        return { success: true, txHash: hash };
      } else {
        return { success: false, error: "Transaction failed" };
      }
    } catch (error: any) {
      console.error("BCC transfer error:", error);
      return {
        success: false,
        error: error.message || "Failed to transfer BCC",
      };
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

