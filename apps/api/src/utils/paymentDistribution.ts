// ============================================
// PAYMENT DISTRIBUTION UTILITY
// Handles USDT payment distribution to company and IT accounts
// ============================================

import { db, transactions } from "../db";
import { eq } from "drizzle-orm";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import { blockchainService } from "../services/BlockchainService";

// Get account addresses from environment
const COMPANY_ACCOUNT = process.env.COMPANY_ACCOUNT_ADDRESS || "0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7";
const IT_ACCOUNT = process.env.IT_ACCOUNT_ADDRESS || "0xe44a701211ef9d3a4ad674986291afcae07bcfc4";

/**
 * Distribute USDT payment for membership purchase
 * Level 1 (130 USDT): User sends 130 to company, system automatically transfers 30 to IT
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
    // Level 1 purchase: User sent 130 USDT to company
    // System automatically transfers 30 USDT from company to IT wallet
    const companyAmount = 100;
    const itAmount = 30;

    // Record the full payment received by company (check for duplicates first)
    const existingCompanyTx = await db.query.transactions.findFirst({
      where: eq(transactions.txHash, txHash),
    });

    if (!existingCompanyTx) {
      await db.insert(transactions).values({
        walletAddress: COMPANY_ACCOUNT.toLowerCase(),
        txHash: txHash,
        transactionType: "deposit",
        currency: "USDT",
        amount: totalAmount.toString(),
        status: "confirmed",
        notes: `Level 1 purchase payment from ${walletAddress} (full amount: ${totalAmount} USDT)`,
      });
    } else {
      console.log(`⚠️ Transaction ${txHash} already exists for company account, skipping insert`);
    }

    // Automatically transfer 30 USDT from company to IT wallet
    try {
      console.log(`\n🔄 ============================================`);
      console.log(`🔄 AUTOMATIC IT WALLET TRANSFER`);
      console.log(`🔄 ============================================`);
      console.log(`🔄 From: Company Wallet (${COMPANY_ACCOUNT})`);
      console.log(`🔄 To: IT Wallet (${IT_ACCOUNT})`);
      console.log(`🔄 Amount: ${itAmount} USDT`);
      console.log(`🔄 User: ${walletAddress}`);
      console.log(`🔄 Transaction: ${txHash}`);
      console.log(`🔄 Starting transfer...`);
      
      // Ensure blockchain service is initialized
      const transferResult = await blockchainService.transferUSDT(IT_ACCOUNT, itAmount);
      
      console.log(`🔄 Transfer result:`, JSON.stringify({
        success: transferResult.success,
        txHash: transferResult.txHash,
        error: transferResult.error
      }, null, 2));
      
      if (transferResult.success && transferResult.txHash) {
        console.log(`✅ ============================================`);
        console.log(`✅ IT WALLET TRANSFER SUCCESSFUL`);
        console.log(`✅ ============================================`);
        console.log(`✅ Transaction Hash: ${transferResult.txHash}`);
        console.log(`✅ Amount: ${itAmount} USDT`);
        console.log(`✅ From: ${COMPANY_ACCOUNT}`);
        console.log(`✅ To: ${IT_ACCOUNT}`);
        console.log(`✅ ============================================\n`);
        // Record the automatic transfer to IT wallet
        await db.insert(transactions).values({
          walletAddress: IT_ACCOUNT.toLowerCase(),
          txHash: transferResult.txHash,
          transactionType: "deposit",
          currency: "USDT",
          amount: itAmount.toString(),
          status: "confirmed",
          notes: `Automatic transfer from company wallet for Level 1 purchase from ${walletAddress}`,
        });

        // Record the outflow from company wallet
        await db.insert(transactions).values({
          walletAddress: COMPANY_ACCOUNT.toLowerCase(),
          txHash: transferResult.txHash,
          transactionType: "withdrawal",
          currency: "USDT",
          amount: itAmount.toString(),
          status: "confirmed",
          notes: `Automatic transfer to IT wallet for Level 1 purchase from ${walletAddress}`,
        });

        console.log(`✅ Level 1 purchase: ${companyAmount} USDT stays with company, ${itAmount} USDT automatically transferred to IT wallet`);
      } else {
        console.error(`\n❌ ============================================`);
        console.error(`❌ IT WALLET TRANSFER FAILED`);
        console.error(`❌ ============================================`);
        console.error(`❌ Error: ${transferResult.error}`);
        console.error(`❌ Amount: ${itAmount} USDT`);
        console.error(`❌ From: ${COMPANY_ACCOUNT}`);
        console.error(`❌ To: ${IT_ACCOUNT}`);
        console.error(`❌ User: ${walletAddress}`);
        console.error(`❌ Original TX: ${txHash}`);
        console.error(`❌ ============================================\n`);
        // Still record the payment but log the error
        await db.insert(transactions).values({
          walletAddress: IT_ACCOUNT.toLowerCase(),
          txHash: null,
          transactionType: "deposit",
          currency: "USDT",
          amount: itAmount.toString(),
          status: "pending",
          notes: `Failed automatic transfer from company wallet for Level 1 purchase from ${walletAddress}. Error: ${transferResult.error}`,
        });
      }
    } catch (error: any) {
      console.error(`\n❌ ============================================`);
      console.error(`❌ IT WALLET TRANSFER EXCEPTION`);
      console.error(`❌ ============================================`);
      console.error(`❌ Error Type: ${error.constructor.name}`);
      console.error(`❌ Error Message: ${error.message}`);
      console.error(`❌ Error Stack:`, error.stack);
      console.error(`❌ Amount: ${itAmount} USDT`);
      console.error(`❌ From: ${COMPANY_ACCOUNT}`);
      console.error(`❌ To: ${IT_ACCOUNT}`);
      console.error(`❌ User: ${walletAddress}`);
      console.error(`❌ Original TX: ${txHash}`);
      console.error(`❌ ============================================\n`);
      // Record as pending for manual review
      await db.insert(transactions).values({
        walletAddress: IT_ACCOUNT.toLowerCase(),
        txHash: null,
        transactionType: "deposit",
        currency: "USDT",
        amount: itAmount.toString(),
        status: "pending",
        notes: `Failed automatic transfer from company wallet for Level 1 purchase from ${walletAddress}. Error: ${error.message}`,
      });
    }
  } else {
    // Upgrade: 100% to company account (no automatic transfer needed)
    // Check for duplicates first
    const existingCompanyTx = await db.query.transactions.findFirst({
      where: eq(transactions.txHash, txHash),
    });

    if (!existingCompanyTx) {
      await db.insert(transactions).values({
        walletAddress: COMPANY_ACCOUNT.toLowerCase(),
        txHash: txHash,
        transactionType: "deposit",
        currency: "USDT",
        amount: totalAmount.toString(),
        status: "confirmed",
        notes: `Level ${level} upgrade payment from ${walletAddress}`,
      });
      console.log(`Upgrade to Level ${level}: ${totalAmount} USDT to company`);
    } else {
      console.log(`⚠️ Transaction ${txHash} already exists for company account, skipping insert`);
    }
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

