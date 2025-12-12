/**
 * Withdrawal Utility
 * Handles withdrawals for both USDT and BCC currencies
 */

import { db } from "../db";
import { transactions, members } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

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
 * 2. Create a transaction record
 * 3. Update the member's balance (decrease)
 * 4. Return the transaction record
 */
export async function processWithdrawal(
  request: WithdrawalRequest
): Promise<{ success: boolean; transactionId?: number; error?: string }> {
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
      // For USDT, you might want to calculate from rewards or have a separate field
      // For now, we'll need to add a usdtBalance field or calculate from rewards
      // This is a placeholder - you may need to adjust based on your USDT balance tracking
      return { success: false, error: "USDT balance tracking not yet implemented" };
    }

    // Check if sufficient balance
    if (currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient ${currency} balance. Available: ${currentBalance}, Requested: ${amount}`,
      };
    }

    // Create transaction record (pending status - will be updated when blockchain tx is confirmed)
    await db
      .insert(transactions)
      .values({
        walletAddress: normalizedWallet,
        transactionType: "withdrawal",
        currency,
        amount: amount.toString(),
        status: "pending",
        notes: notes || `Withdrawal of ${amount} ${currency}`,
      });

    // Get the inserted transaction ID (query the most recent pending withdrawal for this wallet)
    const [insertedTransaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.walletAddress, normalizedWallet),
          eq(transactions.transactionType, "withdrawal"),
          eq(transactions.currency, currency),
          eq(transactions.status, "pending")
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(1);

    // Update balance (decrease)
    if (currency === "BCC") {
      const newBalance = (currentBalance - amount).toString();
      await db
        .update(members)
        .set({ bccBalance: newBalance })
        .where(eq(members.walletAddress, normalizedWallet));
    }

    return {
      success: true,
      transactionId: insertedTransaction?.id,
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

