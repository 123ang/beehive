// ============================================
// CONTRACT CONFIGURATION
// ============================================

// Contract addresses (update after deployment)
export const CONTRACTS = {
  MEMBERSHIP: process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT || "0x0000000000000000000000000000000000000000", // Not needed
  REWARDS: process.env.NEXT_PUBLIC_REWARDS_CONTRACT || "0x0000000000000000000000000000000000000000", // Not needed
  BCC_TOKEN: process.env.NEXT_PUBLIC_BCC_TOKEN_CONTRACT || "0xe1d791FE419ee701FbC55dd1AA4107bcd5AB7FC8", // BCC Token
  USDT: process.env.NEXT_PUBLIC_USDT_CONTRACT || "0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85", // TUSDT (Test USDT)
  NFT_MARKETPLACE: process.env.NEXT_PUBLIC_NFT_CONTRACT || "0x96c5BF42e52fe4C7a972241FF0b548dDda696Ee8", // NFT1155 Marketplace
  COMPANY_ACCOUNT: process.env.NEXT_PUBLIC_COMPANY_ACCOUNT || "0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7", // Company Account
  IT_ACCOUNT: process.env.NEXT_PUBLIC_IT_ACCOUNT || "0xe44a701211ef9d3a4ad674986291afcae07bcfc4", // IT Account
} as const;

// BeehiveMembership ABI (essential functions only)
export const MEMBERSHIP_ABI = [
  {
    name: "purchaseLevel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_level", type: "uint256" },
      { name: "_referrer", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "memberLevel",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "referrer",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "getLevelInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_level", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "priceUSDT", type: "uint256" },
          { name: "bccReward", type: "uint256" },
          { name: "name", type: "string" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getMemberInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_member", type: "address" }],
    outputs: [
      { name: "level", type: "uint256" },
      { name: "ref", type: "address" },
      { name: "ownedTokens", type: "uint256[]" },
    ],
  },
] as const;

// BeehiveRewards ABI (essential functions only)
export const REWARDS_ABI = [
  {
    name: "claimRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "claimUSDTRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "claimBCCRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "getRewardInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_member", type: "address" }],
    outputs: [
      { name: "pendingUSDT", type: "uint256" },
      { name: "pendingBCC", type: "uint256" },
      { name: "claimedUSDT", type: "uint256" },
      { name: "claimedBCC", type: "uint256" },
    ],
  },
] as const;

// ERC-20 ABI for USDT approval
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// ERC1155 ABI (for NFT marketplace)
export const ERC1155_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOfBatch",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "accounts", type: "address[]" },
      { name: "ids", type: "uint256[]" },
    ],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "safeTransferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

// NFT Marketplace ABI
export const NFT_MARKETPLACE_ABI = [
  {
    name: "tokenInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
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
    outputs: [{ type: "string" }],
  },
  {
    name: "symbolOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "totalSupplyOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "priceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
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
  {
    name: "TBCC",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  ...ERC1155_ABI,
] as const;

