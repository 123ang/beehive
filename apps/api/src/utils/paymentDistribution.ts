// ============================================
// PAYMENT DISTRIBUTION UTILITY
// Handles USDT payment distribution to company and IT accounts
// ============================================

import { db, transactions } from "../db";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";

// Get account addresses from environment
const COMPANY_ACCOUNT = process.env.COMPANY_ACCOUNT_ADDRESS || "0xba48b5b1f835ebfc5174c982405b3a7a11b655d0";
const IT_ACCOUNT = process.env.IT_ACCOUNT_ADDRESS || "0xe44a701211ef9d3a4ad674986291afcae07bcfc4";

/**
 * Distribute USDT payment for membership purchase
 * Level 1 (130 USDT): 100 to company, 30 to IT
 * Upgrades: 100% to company account
 * 
 * @param walletAddress User's wallet address
 * @param level Membership level purchased
 * @param txHash Transaction hash from blockchain
 * @param previousLevel Previous level (0 for new members, >0 for upgrades)
 */
export async function distributePurchasePayment(
  walletAddress: string,
  level: number,
  txHash: string,
  previousLevel: number = 0
): Promise<void> {
  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  if (!levelInfo) {
    throw new Error(`Invalid level: ${level}`);
  }

  const totalAmount = levelInfo.priceUSDT;
  const isLevel1Purchase = level === 1 && previousLevel === 0;

  if (isLevel1Purchase) {
    // Level 1 purchase: 100 USDT to company, 30 USDT to IT
    const companyAmount = 100;
    const itAmount = 30;

    // Record company payment
    await db.insert(transactions).values({
      walletAddress: COMPANY_ACCOUNT.toLowerCase(),
      txHash: `${txHash}-company`,
      transactionType: "deposit",
      currency: "USDT",
      amount: companyAmount.toString(),
      status: "confirmed",
      notes: `Level 1 purchase payment from ${walletAddress}`,
    });

    // Record IT payment
    await db.insert(transactions).values({
      walletAddress: IT_ACCOUNT.toLowerCase(),
      txHash: `${txHash}-it`,
      transactionType: "deposit",
      currency: "USDT",
      amount: itAmount.toString(),
      status: "confirmed",
      notes: `Level 1 purchase payment from ${walletAddress}`,
    });

    console.log(`Level 1 purchase: ${companyAmount} USDT to company, ${itAmount} USDT to IT`);
  } else {
    // Upgrade: 100% to company account
    await db.insert(transactions).values({
      walletAddress: COMPANY_ACCOUNT.toLowerCase(),
      txHash: `${txHash}-company`,
      transactionType: "deposit",
      currency: "USDT",
      amount: totalAmount.toString(),
      status: "confirmed",
      notes: `Level ${level} upgrade payment from ${walletAddress}`,
    });

    console.log(`Upgrade to Level ${level}: ${totalAmount} USDT to company`);
  }
}

/**
 * Process USDT reward payment from company account
 * When a user claims USDT rewards, the payment should come from company account
 * 
 * @param recipientWallet Wallet address receiving the reward
 * @param amount Reward amount in USDT
 * @param rewardType Type of reward (direct_sponsor, layer_payout, etc.)
 * @param sourceWallet Source wallet that triggered the reward
 */
export async function processUSDTRewardPayment(
  recipientWallet: string,
  amount: number,
  rewardType: string,
  sourceWallet?: string
): Promise<void> {
  // Record the reward payment from company account
  await db.insert(transactions).values({
    walletAddress: recipientWallet.toLowerCase(),
    transactionType: "deposit",
    currency: "USDT",
    amount: amount.toString(),
    status: "confirmed",
    notes: `USDT reward (${rewardType}) from company account${sourceWallet ? ` - triggered by ${sourceWallet}` : ""}`,
  });

  // Record the outflow from company account
  await db.insert(transactions).values({
    walletAddress: COMPANY_ACCOUNT.toLowerCase(),
    txHash: null,
    transactionType: "withdrawal",
    currency: "USDT",
    amount: amount.toString(),
    status: "confirmed",
    notes: `USDT reward payment to ${recipientWallet} (${rewardType})`,
  });

  console.log(`USDT reward: ${amount} USDT paid from company account to ${recipientWallet}`);
}

/**
 * Get company account address
 */
export function getCompanyAccount(): string {
  return COMPANY_ACCOUNT;
}

/**
 * Get IT account address
 */
export function getITAccount(): string {
  return IT_ACCOUNT;
}

