// ============================================
// BEEHIVE SHARED CONSTANTS
// ============================================

import type { MembershipLevel } from './types';

// Maximum membership level
export const MAX_LEVEL = 19;

// Matrix configuration
export const MATRIX_WIDTH = 3; // 3x3 matrix

// Direct sponsor reward amount (100 USDT in wei - 6 decimals)
export const DIRECT_SPONSOR_REWARD = 100_000_000n;

// Pending reward expiration time (72 hours in milliseconds)
export const PENDING_REWARD_EXPIRY_MS = 72 * 60 * 60 * 1000;

// Membership level definitions
export const MEMBERSHIP_LEVELS: MembershipLevel[] = [
  { level: 1, name: 'Warrior', nameCn: '战士', priceUSDT: 130, bccReward: 500, active: true },
  { level: 2, name: 'Bronze', nameCn: '青铜', priceUSDT: 150, bccReward: 100, active: true },
  { level: 3, name: 'Silver', nameCn: '白银', priceUSDT: 200, bccReward: 200, active: true },
  { level: 4, name: 'Gold', nameCn: '黄金', priceUSDT: 250, bccReward: 300, active: true },
  { level: 5, name: 'Elite', nameCn: '精英', priceUSDT: 300, bccReward: 400, active: true },
  { level: 6, name: 'Platinum', nameCn: '铂金', priceUSDT: 350, bccReward: 500, active: true },
  { level: 7, name: 'Master', nameCn: '大师', priceUSDT: 400, bccReward: 600, active: true },
  { level: 8, name: 'Diamond', nameCn: '钻石', priceUSDT: 450, bccReward: 700, active: true },
  { level: 9, name: 'Grandmaster', nameCn: '宗师', priceUSDT: 500, bccReward: 800, active: true },
  { level: 10, name: 'Starlight', nameCn: '星耀', priceUSDT: 550, bccReward: 900, active: true },
  { level: 11, name: 'Epic', nameCn: '史诗', priceUSDT: 600, bccReward: 1000, active: true },
  { level: 12, name: 'Legend', nameCn: '传说', priceUSDT: 650, bccReward: 1100, active: true },
  { level: 13, name: 'Supreme King', nameCn: '无上王者', priceUSDT: 700, bccReward: 1200, active: true },
  { level: 14, name: 'Peerless King', nameCn: '绝世王者', priceUSDT: 750, bccReward: 1300, active: true },
  { level: 15, name: 'Glory King', nameCn: '荣耀王者', priceUSDT: 800, bccReward: 1400, active: true },
  { level: 16, name: 'Legendary', nameCn: '神话', priceUSDT: 850, bccReward: 1500, active: true },
  { level: 17, name: 'Supreme', nameCn: '至尊', priceUSDT: 900, bccReward: 1600, active: true },
  { level: 18, name: 'Mythic', nameCn: '神话级', priceUSDT: 950, bccReward: 900, active: true },
  { level: 19, name: 'Mythic Apex', nameCn: '神话巅峰', priceUSDT: 1000, bccReward: 1950, active: true },
];

// Layer reward amounts (USDT, 6 decimals)
export const LAYER_REWARD_AMOUNTS: Record<number, number> = {
  2: 150,
  3: 200,
  4: 250,
  5: 300,
  6: 350,
  7: 400,
  8: 450,
  9: 500,
  10: 550,
  11: 600,
  12: 650,
  13: 700,
  14: 750,
  15: 800,
  16: 850,
  17: 900,
  18: 950,
  19: 1000,
};

// Arbitrum contract addresses
export const ARBITRUM_CONTRACTS = {
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum One USDT
};

// Chain configuration
export const CHAINS = {
  ARBITRUM_ONE: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
  },
  ARBITRUM_SEPOLIA: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
  },
};

// Helper function to get level by number
export function getLevelByNumber(level: number): MembershipLevel | undefined {
  return MEMBERSHIP_LEVELS.find((l) => l.level === level);
}

// Helper function to get layer reward amount
export function getLayerRewardAmount(level: number): number {
  return LAYER_REWARD_AMOUNTS[level] || 0;
}

// Calculate total price for all levels up to target
export function calculateTotalInvestment(targetLevel: number): number {
  return MEMBERSHIP_LEVELS
    .filter((l) => l.level <= targetLevel)
    .reduce((sum, l) => sum + l.priceUSDT, 0);
}

