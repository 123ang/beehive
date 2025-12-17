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
  try {
    console.log(`\n🎁 ============================================`);
    console.log(`🎁 AWARDING BCC REWARD`);
    console.log(`🎁 ============================================`);
    console.log(`🎁 Wallet: ${walletAddress}`);
    console.log(`🎁 Level: ${level}`);
    console.log(`🎁 Notes: ${notes || 'N/A'}`);
    
    // Find the level configuration
    const levelConfig = MEMBERSHIP_LEVELS.find((l) => l.level === level);
    
    if (!levelConfig) {
      console.error(`❌ Invalid membership level: ${level}`);
      return;
    }

    const bccAmount = levelConfig.bccReward;
    console.log(`🎁 BCC Amount from config: ${bccAmount}`);

    if (bccAmount <= 0) {
      console.warn(`⚠️ No BCC reward for level ${level} (amount: ${bccAmount})`);
      return;
    }

    // Create BCC reward record in rewards table
    console.log(`🎁 Inserting reward record...`);
    await db.insert(rewards).values({
      recipientWallet: walletAddress.toLowerCase(),
      sourceWallet: sourceWallet?.toLowerCase() || null,
      rewardType: "bcc_token",
      amount: bccAmount.toString(),
      currency: "BCC",
      status: "instant", // BCC rewards are instant
      notes: notes || `BCC reward for Level ${level} membership`,
    });
    console.log(`✅ Reward record inserted`);

    // Update BCC balance in members table
    const normalizedWallet = walletAddress.toLowerCase();
    console.log(`🎁 Looking up member: ${normalizedWallet}`);
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.walletAddress, normalizedWallet))
      .limit(1);

    if (member) {
      // Update balance by adding the reward amount
      const currentBalance = parseFloat(member.bccBalance?.toString() || "0");
      const newBalance = (currentBalance + bccAmount).toString();
      console.log(`🎁 Current BCC Balance: ${currentBalance}`);
      console.log(`🎁 New BCC Balance: ${newBalance}`);

      await db
        .update(members)
        .set({
          bccBalance: newBalance,
        })
        .where(eq(members.walletAddress, normalizedWallet));
      console.log(`✅ Member BCC balance updated`);
    } else {
      console.warn(`⚠️ Member not found for wallet ${normalizedWallet}, reward recorded but balance not updated`);
    }

    console.log(`✅ Successfully awarded ${bccAmount} BCC to ${walletAddress} for Level ${level}`);
    console.log(`🎁 ============================================\n`);
  } catch (error: any) {
    console.error(`\n❌ ============================================`);
    console.error(`❌ ERROR AWARDING BCC REWARD`);
    console.error(`❌ ============================================`);
    console.error(`❌ Wallet: ${walletAddress}`);
    console.error(`❌ Level: ${level}`);
    console.error(`❌ Error: ${error.message}`);
    console.error(`❌ Stack: ${error.stack}`);
    console.error(`❌ ============================================\n`);
    throw error; // Re-throw to ensure the error is visible
  }
}

