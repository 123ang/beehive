/**
 * Withdrawal Utility
 * Handles withdrawals for both USDT and BCC currencies
 */

import { db } from "../db";
import { transactions, members, rewards } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { rewardService } from "../services/RewardService";
import { blockchainService } from "../services/BlockchainService";

export type Currency = "USDT" | "BCC";

export interface WithdrawalRequest {
  walletAddress: string;
  currency: Currency;
  amount: number;
  notes?: string;
}

/**
 * Process a withdrawal request
 * This will:
 * 1. Check if user has sufficient balance
 * 2. Transfer tokens from company account to member (blockchain)
 * 3. Create a transaction record
 * 4. Update the member's balance (decrease)
 * 5. Mark rewards as claimed
 * 6. Return the transaction record
 */
export async function processWithdrawal(
  request: WithdrawalRequest
): Promise<{ success: boolean; transactionId?: number; txHash?: string; error?: string }> {
  const { walletAddress, currency, amount, notes } = request;
  const normalizedWallet = walletAddress.toLowerCase();

  try {
    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.walletAddress, normalizedWallet))
      .limit(1);

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    // Check balance based on currency
    let currentBalance: number;
    if (currency === "BCC") {
      currentBalance = parseFloat(member.bccBalance?.toString() || "0");
    } else {
      // For USDT, calculate from rewards (pending + claimed)
      const rewardSummary = await rewardService.getRewardSummary(normalizedWallet);
      const pendingUSDT = parseFloat(rewardSummary.pendingUSDT || "0");
      const claimedUSDT = parseFloat(rewardSummary.claimedUSDT || "0");
      // Available USDT = pending rewards (not yet claimed)
      currentBalance = pendingUSDT;
    }

    // Check if sufficient balance
    if (currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient ${currency} balance. Available: ${currentBalance}, Requested: ${amount}`,
      };
    }

    // Execute blockchain transfer from company account to member
    let txHash: string | undefined;
    if (currency === "USDT") {
      const transferResult = await blockchainService.transferUSDT(normalizedWallet, amount);
      if (!transferResult.success) {
        return { success: false, error: transferResult.error || "Failed to transfer USDT" };
      }
      txHash = transferResult.txHash;
    } else {
      const transferResult = await blockchainService.transferBCC(normalizedWallet, amount);
      if (!transferResult.success) {
        return { success: false, error: transferResult.error || "Failed to transfer BCC" };
      }
      txHash = transferResult.txHash;
    }

    if (!txHash) {
      return { success: false, error: "Transaction hash not received" };
    }

    // Create transaction record (confirmed since blockchain tx succeeded)
    await db
      .insert(transactions)
      .values({
        walletAddress: normalizedWallet,
        transactionType: "withdrawal",
        currency,
        amount: amount.toString(),
        status: "confirmed",
        txHash: txHash,
        notes: notes || `Withdrawal of ${amount} ${currency}`,
      });

    // Get the inserted transaction ID
    const [insertedTransaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.walletAddress, normalizedWallet),
          eq(transactions.transactionType, "withdrawal"),
          eq(transactions.currency, currency),
          eq(transactions.txHash, txHash)
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(1);

    // Log member activity
    const { logMemberActivity } = await import("./memberActivityLogger");
    await logMemberActivity({
      walletAddress: normalizedWallet,
      activityType: "withdrawal",
      metadata: {
        currency,
        amount,
        txHash,
        transactionId: insertedTransaction?.id,
      },
    });

    // Update balance (decrease)
    if (currency === "BCC") {
      const newBalance = (currentBalance - amount).toString();
      await db
        .update(members)
        .set({ bccBalance: newBalance })
        .where(eq(members.walletAddress, normalizedWallet));
    } else {
      // For USDT, mark pending rewards as claimed (up to the withdrawal amount)
      // Get pending USDT rewards and mark them as claimed
      const pendingRewards = await db
        .select()
        .from(rewards)
        .where(
          and(
            eq(rewards.recipientWallet, normalizedWallet),
            eq(rewards.currency, "USDT"),
            eq(rewards.status, "pending")
          )
        )
        .orderBy(desc(rewards.createdAt));

      let remainingAmount = amount;
      for (const reward of pendingRewards) {
        if (remainingAmount <= 0) break;
        
        const rewardAmount = parseFloat(reward.amount);
        if (rewardAmount <= remainingAmount) {
          // Mark entire reward as claimed
          await db
            .update(rewards)
            .set({ status: "instant" }) // "instant" means claimed/withdrawn
            .where(eq(rewards.id, reward.id));
          remainingAmount -= rewardAmount;
        } else {
          // Partial claim - split the reward
          // Mark part as claimed, create new pending reward for remainder
          const claimedAmount = remainingAmount;
          const remainingReward = rewardAmount - claimedAmount;
          
          // Update original reward to claimed amount
          await db
            .update(rewards)
            .set({
              amount: claimedAmount.toString(),
              status: "instant",
            })
            .where(eq(rewards.id, reward.id));
          
          // Create new pending reward for remainder
          if (remainingReward > 0) {
            await db.insert(rewards).values({
              recipientWallet: reward.recipientWallet,
              sourceWallet: reward.sourceWallet,
              rewardType: reward.rewardType,
              amount: remainingReward.toString(),
              currency: reward.currency,
              status: "pending",
              notes: reward.notes,
            });
          }
          
          remainingAmount = 0;
        }
      }
    }

    return {
      success: true,
      transactionId: insertedTransaction?.id,
      txHash: txHash,
    };
  } catch (error) {
    console.error("Withdrawal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Confirm a withdrawal transaction (when blockchain tx is confirmed)
 */
export async function confirmWithdrawal(
  transactionId: number,
  txHash: string,
  blockNumber?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(transactions)
      .set({
        txHash,
        status: "confirmed",
        blockNumber: blockNumber || null,
        confirmedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));

    return { success: true };
  } catch (error) {
    console.error("Confirm withdrawal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get withdrawal history for a wallet
 */
export async function getWithdrawalHistory(
  walletAddress: string,
  currency?: Currency
) {
  const normalizedWallet = walletAddress.toLowerCase();

  const conditions = [
    eq(transactions.walletAddress, normalizedWallet),
    eq(transactions.transactionType, "withdrawal"),
  ];

  if (currency) {
    conditions.push(eq(transactions.currency, currency));
  }

  return await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt));
}

