/**
 * Script to fix reward amounts that were truncated due to DECIMAL(18,18) precision issue
 * Rewards stored as 0.999999999999999999 need to be updated to their correct values
 * 
 * Run: pnpm --filter @beehive/api db:fix-reward-amounts
 */

// Load environment variables
import { config } from "dotenv";
config({ path: "../../.env" });

import { db } from "../db/index.js";
import { rewards } from "../db/schema.js";
import { eq, sql, and, or } from "drizzle-orm";
import { MEMBERSHIP_LEVELS, LAYER_REWARD_AMOUNTS } from "@beehive/shared";

// Direct sponsor reward amount
const DIRECT_SPONSOR_REWARD = 100; // 100 USDT

async function fixRewardAmounts() {
  console.log("Starting reward amount fix...\n");

  try {
    // Find all rewards with truncated amounts (close to 0.999999999999999999)
    // We'll check for amounts between 0.9 and 1.0
    const allRewards = await db
      .select()
      .from(rewards);

    console.log(`Found ${allRewards.length} total rewards`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const reward of allRewards) {
      try {
        const currentAmount = parseFloat(reward.amount);
        const amountString = reward.amount.toString();
        
        // Check if amount is truncated:
        // 1. Between 0.9 and 1.0 (exclusive)
        // 2. Contains many 9s (like 0.999999999999999999)
        // 3. Very close to 1.0 but not exactly 1.0
        const isTruncated = 
          (currentAmount >= 0.9 && currentAmount < 1.0) ||
          (amountString.includes("0.999") && amountString.length > 5) ||
          (currentAmount > 0.99 && currentAmount < 1.0);
        
        if (!isTruncated) {
          skippedCount++;
          continue;
        }

        let correctAmount: number | null = null;

        // Determine correct amount based on reward type
        if (reward.rewardType === "direct_sponsor") {
          correctAmount = DIRECT_SPONSOR_REWARD;
        } else if (reward.rewardType === "layer_payout") {
          if (reward.layerNumber) {
            correctAmount = LAYER_REWARD_AMOUNTS[reward.layerNumber] || 0;
          } else {
            console.warn(`⚠ Reward ${reward.id}: layer_payout but no layerNumber, skipping`);
            skippedCount++;
            continue;
          }
        } else if (reward.rewardType === "bcc_token") {
          // Try to extract level from notes
          const notes = reward.notes || "";
          let level: number | null = null;
          
          // Pattern 1: "Level X" or "Level X membership"
          const levelMatch = notes.match(/Level (\d+)/);
          if (levelMatch) {
            level = parseInt(levelMatch[1]);
          }
          
          // Pattern 2: "BCC reward for Level X membership"
          if (!level) {
            const levelMatch2 = notes.match(/for Level (\d+)/);
            if (levelMatch2) {
              level = parseInt(levelMatch2[1]);
            }
          }
          
          if (level) {
            const levelConfig = MEMBERSHIP_LEVELS.find((l) => l.level === level);
            if (levelConfig) {
              correctAmount = levelConfig.bccReward;
            } else {
              console.warn(`⚠ Reward ${reward.id}: Invalid level ${level} in notes, skipping`);
              skippedCount++;
              continue;
            }
          } else {
            // Try to find member and check their level at the time of reward creation
            // This is a fallback - check recipient wallet's current level
            const { members } = await import("../db/schema.js");
            const { eq } = await import("drizzle-orm");
            const member = await db.query.members.findFirst({
              where: eq(members.walletAddress, reward.recipientWallet.toLowerCase()),
            });
            
            if (member && member.currentLevel) {
              const levelConfig = MEMBERSHIP_LEVELS.find((l) => l.level === member.currentLevel);
              if (levelConfig) {
                correctAmount = levelConfig.bccReward;
                console.log(`  → Inferred level ${member.currentLevel} from member ${reward.recipientWallet}`);
              }
            }
            
            if (!correctAmount) {
              console.warn(`⚠ Reward ${reward.id}: bcc_token but cannot determine level from notes: "${notes}", skipping`);
              skippedCount++;
              continue;
            }
          }
        } else {
          console.warn(`⚠ Reward ${reward.id}: Unknown reward type "${reward.rewardType}", skipping`);
          skippedCount++;
          continue;
        }

        if (correctAmount === null || correctAmount === 0) {
          console.warn(`⚠ Reward ${reward.id}: Could not determine correct amount, skipping`);
          skippedCount++;
          continue;
        }

        // Update the reward amount
        await db
          .update(rewards)
          .set({
            amount: correctAmount.toString(),
          })
          .where(eq(rewards.id, reward.id));

        console.log(
          `✓ Reward ${reward.id}: Updated ${reward.rewardType} (${reward.currency}) from ${currentAmount} to ${correctAmount}`
        );

        fixedCount++;
      } catch (error) {
        console.error(`✗ Error processing reward ${reward.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nProcessed ${allRewards.length} rewards:`);
    console.log(`  ✓ Fixed: ${fixedCount}`);
    console.log(`  ⊘ Skipped (not truncated or cannot determine): ${skippedCount}`);
    if (errorCount > 0) {
      console.log(`  ✗ Errors: ${errorCount}`);
    }

    console.log("\n✓ Reward amount fix completed!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
fixRewardAmounts()
  .then(() => {
    console.log("\nScript completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

