/**
 * BCC Rewards Utility
 * Handles BCC token rewards based on membership level
 */

import { db } from "../db";
import { rewards, members } from "../db/schema";
import { eq } from "drizzle-orm";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";

/**
 * Award BCC tokens to a user based on their membership level
 * @param walletAddress User's wallet address
 * @param level Membership level (1-19)
 * @param sourceWallet Optional source wallet (e.g., for registration rewards)
 * @param notes Optional notes for the reward
 */
export async function awardBCCReward(
  walletAddress: string,
  level: number,
  sourceWallet?: string,
  notes?: string
): Promise<void> {
  // Find the level configuration
  const levelConfig = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  
  if (!levelConfig) {
    console.warn(`Invalid membership level: ${level}`);
    return;
  }

  const bccAmount = levelConfig.bccReward;

  if (bccAmount <= 0) {
    console.warn(`No BCC reward for level ${level}`);
    return;
  }

  // Create BCC reward record in rewards table
  await db.insert(rewards).values({
    recipientWallet: walletAddress.toLowerCase(),
    sourceWallet: sourceWallet?.toLowerCase() || null,
    rewardType: "bcc_token",
    amount: bccAmount.toString(),
    currency: "BCC",
    status: "instant", // BCC rewards are instant
    notes: notes || `BCC reward for Level ${level} membership`,
  });

  // Update BCC balance in members table
  const normalizedWallet = walletAddress.toLowerCase();
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.walletAddress, normalizedWallet))
    .limit(1);

  if (member) {
    // Update balance by adding the reward amount
    const currentBalance = parseFloat(member.bccBalance?.toString() || "0");
    const newBalance = (currentBalance + bccAmount).toString();

    await db
      .update(members)
      .set({
        bccBalance: newBalance,
      })
      .where(eq(members.walletAddress, normalizedWallet));
  }

  console.log(`Awarded ${bccAmount} BCC to ${walletAddress} for Level ${level}`);
}

