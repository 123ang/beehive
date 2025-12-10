// ============================================
// CONTRACT CONFIGURATION
// ============================================

// Contract addresses (update after deployment)
export const CONTRACTS = {
  MEMBERSHIP: process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT || "0x0000000000000000000000000000000000000000",
  REWARDS: process.env.NEXT_PUBLIC_REWARDS_CONTRACT || "0x0000000000000000000000000000000000000000",
  BCC_TOKEN: process.env.NEXT_PUBLIC_BCC_TOKEN_CONTRACT || "0x0000000000000000000000000000000000000000",
  USDT: process.env.NEXT_PUBLIC_USDT_CONTRACT || "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Arbitrum USDT
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
] as const;

