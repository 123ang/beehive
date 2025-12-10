// ============================================
// BEEHIVE SHARED TYPES
// ============================================

// Membership Level Types
export interface MembershipLevel {
  level: number;
  name: string;
  nameCn: string;
  priceUSDT: number;
  bccReward: number;
  active: boolean;
}

// User Types
export interface User {
  id: number;
  walletAddress: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  language: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Member Types
export interface Member {
  id: number;
  walletAddress: string;
  username?: string;
  rootId?: number;
  sponsorId?: number;
  currentLevel: number;
  totalInflow: string;
  totalOutflowUsdt: string;
  totalOutflowBcc: number;
  directSponsorCount: number;
  joinedAt: Date;
}

// Reward Types
export type RewardType = 'direct_sponsor' | 'layer_payout' | 'bcc_token';
export type RewardStatus = 'instant' | 'pending' | 'claimed' | 'expired';
export type Currency = 'USDT' | 'BCC';

export interface Reward {
  id: number;
  recipientWallet: string;
  sourceWallet?: string;
  rewardType: RewardType;
  amount: string;
  currency: Currency;
  status: RewardStatus;
  layerNumber?: number;
  pendingExpiresAt?: Date;
  notes?: string;
  createdAt: Date;
  claimedAt?: Date;
}

// Transaction Types
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: number;
  walletAddress: string;
  txHash?: string;
  level: number;
  amount: string;
  status: TransactionStatus;
  createdAt: Date;
}

// Matrix Tree Types
export interface TreeNode {
  id: number;
  walletAddress: string;
  username?: string;
  currentLevel: number;
  position: number;
  depth: number;
  children: TreeNode[];
}

export interface Placement {
  parentId: number;
  childId: number;
  position: number; // 1, 2, or 3
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth Types
export interface AuthPayload {
  address: string;
  nonce: string;
  signature: string;
}

export interface AuthSession {
  userId: number;
  walletAddress: string;
  isAdmin: boolean;
  expiresAt: number;
}

// Dashboard Stats Types
export interface DashboardStats {
  currentLevel: number;
  totalEarningsUSDT: string;
  totalEarningsBCC: string;
  pendingRewardsUSDT: string;
  pendingRewardsBCC: string;
  directReferrals: number;
  teamSize: number;
}

// Reward Summary Types
export interface RewardSummary {
  totalDirectSponsor: string;
  totalLayerPayout: string;
  totalBCC: string;
  pendingUSDT: string;
  pendingBCC: string;
  claimedUSDT: string;
  claimedBCC: string;
}

