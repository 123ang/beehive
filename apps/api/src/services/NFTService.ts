// ============================================
// NFT SERVICE
// Handles NFT1155Marketplace contract interactions
// 
// Contract: NFT1155Marketplace (ERC1155 + TBCC payments)
// 
// Flow:
// 1. Admin calls createAndMint() to create NFT type → mints to company wallet
// 2. Admin calls mintMore() to increase supply
// 3. User approves TBCC spending on frontend
// 4. User calls buyNFT() on contract → pays TBCC, receives NFT (all on-chain)
// ============================================

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, bscTestnet } from "viem/chains";

// Note: .env file is already loaded by index.ts before this service is imported
// Environment variables are available via process.env

// NFT1155Marketplace ABI (your contract)
const NFT1155_MARKETPLACE_ABI = [
  // Create new NFT type (owner only)
  {
    name: "createAndMint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "tokenName", type: "string" },
      { name: "tokenSymbol", type: "string" },
      { name: "priceInTBCC", type: "uint256" },
    ],
    outputs: [{ name: "newId", type: "uint256" }],
  },
  // Mint more of existing token (owner only)
  {
    name: "mintMore",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  // User buy NFT (pays TBCC, receives NFT)
  {
    name: "buyNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  // User sell back NFT
  {
    name: "sellBackNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  // Read functions
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "totalSupply", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    name: "nameOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbolOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "totalSupplyOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "priceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "TBCC",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// ERC20 ABI for TBCC token
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
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
    name: "transferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
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

export interface CreateAndMintResult {
  success: boolean;
  txHash?: string;
  tokenId?: number;
  error?: string;
}

export interface MintMoreResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: bigint;
  price: bigint;
  exists: boolean;
}

export class NFTService {
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private publicClient: ReturnType<typeof createPublicClient> | null = null;
  private account: ReturnType<typeof privateKeyToAccount> | null = null;
  private chain: typeof bsc | typeof bscTestnet = bsc;
  private initialized: boolean = false;

  constructor() {
    // Lazy initialization
  }

  private async initialize() {
    if (this.initialized) return;

    console.log("🔍 NFTService initializing...");

    let COMPANY_PRIVATE_KEY: string | null = null;

    try {
      if (getEnvVar("USE_GOOGLE_KMS") === "true") {
        console.log("🔍 Attempting to retrieve private key from Google KMS...");
        const { kmsService } = await import("./KMSService");
        COMPANY_PRIVATE_KEY = await kmsService.getPrivateKey();
        console.log("✅ Retrieved private key from Google KMS");
      } else {
        COMPANY_PRIVATE_KEY = getEnvVar("COMPANY_PRIVATE_KEY");
        if (COMPANY_PRIVATE_KEY) {
          console.log("⚠️ Using private key from .env");
        }
      }
    } catch (error: any) {
      console.error("❌ Failed to get private key:", error.message);
      if (getEnvVar("USE_GOOGLE_KMS") === "true") {
        COMPANY_PRIVATE_KEY = getEnvVar("COMPANY_PRIVATE_KEY");
      }
    }

    if (!COMPANY_PRIVATE_KEY) {
      console.error("❌ COMPANY_PRIVATE_KEY not available.");
      this.initialized = true;
      return;
    }

    try {
      const RPC_URL = getEnvVar("BSC_RPC_URL", "https://bsc-dataseed1.binance.org/");
      this.chain = getChain();

      const privateKey = COMPANY_PRIVATE_KEY.startsWith("0x")
        ? COMPANY_PRIVATE_KEY
        : `0x${COMPANY_PRIVATE_KEY}`;

      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      console.log("🔍 NFT Wallet address:", this.account.address);

      this.publicClient = createPublicClient({
        chain: this.chain,
        transport: http(RPC_URL),
      });

      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.chain,
        transport: http(RPC_URL),
      });

      this.initialized = true;
      console.log("✅ NFTService initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize NFT service:", error);
      this.initialized = true;
    }
  }

  /**
   * Get company wallet address (contract owner)
   */
  getCompanyWalletAddress(): string {
    return getEnvVar("COMPANY_ACCOUNT_ADDRESS", "");
  }

  /**
   * Get NFT marketplace contract address
   */
  getNFTContractAddress(): string {
    return getEnvVar("NFT_MARKETPLACE_CONTRACT_ADDRESS", "");
  }

  /**
   * Create and mint a new NFT type (Admin only)
   * Calls createAndMint() on the contract
   * 
   * @param name - Token name
   * @param symbol - Token symbol
   * @param amount - Initial supply to mint to company wallet
   * @param priceInTBCC - Price per NFT in TBCC (with decimals)
   * @param contractAddress - Optional override for contract address
   */
  async createAndMint(
    name: string,
    symbol: string,
    amount: number,
    priceInTBCC: bigint,
    contractAddress?: string
  ): Promise<CreateAndMintResult> {
    await this.initialize();

    if (!this.walletClient || !this.publicClient || !this.account) {
      return { success: false, error: "NFT service not initialized" };
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return { success: false, error: "NFT contract address not configured" };
      }

      const COMPANY_WALLET = this.getCompanyWalletAddress();
      if (!COMPANY_WALLET) {
        return { success: false, error: "Company wallet address not configured" };
      }

      console.log(`🎨 Creating new NFT type: ${name} (${symbol})`);
      console.log(`   Amount: ${amount}`);
      console.log(`   Price: ${priceInTBCC} TBCC`);
      console.log(`   To: ${COMPANY_WALLET}`);
      console.log(`   Contract: ${CONTRACT}`);

      const hash = await this.walletClient.writeContract({
        account: this.account,
        chain: this.chain,
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "createAndMint",
        args: [
          COMPANY_WALLET as `0x${string}`,
          BigInt(amount),
          name,
          symbol,
          priceInTBCC,
        ],
      });

      console.log(`📝 createAndMint transaction submitted: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        console.log(`✅ NFT type created successfully`);
        // Note: To get the new tokenId, you'd need to decode the logs
        return { success: true, txHash: hash };
      } else {
        return { success: false, error: "createAndMint transaction failed" };
      }
    } catch (error: any) {
      console.error("❌ createAndMint error:", error);
      return {
        success: false,
        error: error.message || "Failed to create NFT type",
      };
    }
  }

  /**
   * Mint more of existing NFT type (Admin only)
   * Calls mintMore() on the contract
   * 
   * @param tokenId - Existing token ID
   * @param amount - Amount to mint
   * @param contractAddress - Optional override for contract address
   */
  async mintMore(
    tokenId: number,
    amount: number,
    contractAddress?: string
  ): Promise<MintMoreResult> {
    await this.initialize();

    if (!this.walletClient || !this.publicClient || !this.account) {
      return { success: false, error: "NFT service not initialized" };
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return { success: false, error: "NFT contract address not configured" };
      }

      const COMPANY_WALLET = this.getCompanyWalletAddress();
      if (!COMPANY_WALLET) {
        return { success: false, error: "Company wallet address not configured" };
      }

      console.log(`🎨 Minting more of token #${tokenId}`);
      console.log(`   Amount: ${amount}`);
      console.log(`   To: ${COMPANY_WALLET}`);
      console.log(`   Contract: ${CONTRACT}`);

      const hash = await this.walletClient.writeContract({
        account: this.account,
        chain: this.chain,
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "mintMore",
        args: [
          COMPANY_WALLET as `0x${string}`,
          BigInt(tokenId),
          BigInt(amount),
        ],
      });

      console.log(`📝 mintMore transaction submitted: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        console.log(`✅ Minted ${amount} more of token #${tokenId}`);
        return { success: true, txHash: hash };
      } else {
        return { success: false, error: "mintMore transaction failed" };
      }
    } catch (error: any) {
      console.error("❌ mintMore error:", error);
      return {
        success: false,
        error: error.message || "Failed to mint more NFTs",
      };
    }
  }

  /**
   * Get token info from contract
   */
  async getTokenInfo(
    tokenId: number,
    contractAddress?: string
  ): Promise<TokenInfo | null> {
    await this.initialize();

    if (!this.publicClient) {
      return null;
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return null;
      }

      const result = await this.publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "tokenInfo",
        args: [BigInt(tokenId)],
      });

      return {
        name: result[0],
        symbol: result[1],
        totalSupply: result[2],
        price: result[3],
        exists: result[4],
      };
    } catch (error: any) {
      console.error("Error getting token info:", error);
      return null;
    }
  }

  /**
   * Get company wallet NFT balance for a specific token ID (ERC1155)
   */
  async getCompanyNFTBalance(
    tokenId: number,
    contractAddress?: string
  ): Promise<number> {
    await this.initialize();

    if (!this.publicClient) {
      return 0;
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      const COMPANY_WALLET = this.getCompanyWalletAddress();
      
      if (!CONTRACT || !COMPANY_WALLET) {
        return 0;
      }

      const balance = await this.publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "balanceOf",
        args: [COMPANY_WALLET as `0x${string}`, BigInt(tokenId)],
      });

      return Number(balance);
    } catch (error: any) {
      console.error("Error getting NFT balance:", error);
      return 0;
    }
  }

  /**
   * Get user's NFT balance for a specific token ID (ERC1155)
   */
  async getUserNFTBalance(
    userAddress: string,
    tokenId: number,
    contractAddress?: string
  ): Promise<number> {
    await this.initialize();

    if (!this.publicClient) {
      return 0;
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return 0;
      }

      const balance = await this.publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`, BigInt(tokenId)],
      });

      return Number(balance);
    } catch (error: any) {
      console.error("Error getting user NFT balance:", error);
      return 0;
    }
  }

  /**
   * Get price of NFT in TBCC
   */
  async getPriceOf(
    tokenId: number,
    contractAddress?: string
  ): Promise<bigint | null> {
    await this.initialize();

    if (!this.publicClient) {
      return null;
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return null;
      }

      const price = await this.publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "priceOf",
        args: [BigInt(tokenId)],
      });

      return price;
    } catch (error: any) {
      console.error("Error getting NFT price:", error);
      return null;
    }
  }

  /**
   * Get total supply of a token
   */
  async getTotalSupplyOf(
    tokenId: number,
    contractAddress?: string
  ): Promise<number> {
    await this.initialize();

    if (!this.publicClient) {
      return 0;
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return 0;
      }

      const supply = await this.publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "totalSupplyOf",
        args: [BigInt(tokenId)],
      });

      return Number(supply);
    } catch (error: any) {
      console.error("Error getting total supply:", error);
      return 0;
    }
  }

  /**
   * Get contract owner address
   */
  async getContractOwner(contractAddress?: string): Promise<string | null> {
    await this.initialize();

    if (!this.publicClient) {
      return null;
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return null;
      }

      const owner = await this.publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "owner",
      });

      return owner as string;
    } catch (error: any) {
      console.error("Error getting contract owner:", error);
      return null;
    }
  }

  /**
   * Get TBCC token address used by the contract
   */
  async getTBCCAddress(contractAddress?: string): Promise<string | null> {
    await this.initialize();

    if (!this.publicClient) {
      return null;
    }

    try {
      const CONTRACT = contractAddress || this.getNFTContractAddress();
      if (!CONTRACT) {
        return null;
      }

      const tbcc = await this.publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: NFT1155_MARKETPLACE_ABI,
        functionName: "TBCC",
      });

      return tbcc as string;
    } catch (error: any) {
      console.error("Error getting TBCC address:", error);
      return null;
    }
  }
}

// Export singleton instance
export const nftService = new NFTService();

