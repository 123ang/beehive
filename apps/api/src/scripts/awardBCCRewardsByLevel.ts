/**
 * Script to award BCC rewards to all members based on their membership level
 * Run: pnpm --filter @beehive/api db:award-bcc-rewards
 */

// Load environment variables
import { config } from "dotenv";
config({ path: "../../.env" });

import { db } from "../db/index.js";
import { members, rewards } from "../db/schema.js";
import { awardBCCReward } from "../utils/bccRewards.js";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import { eq, and } from "drizzle-orm";

async function awardBCCRewardsForAllMembers() {
  console.log("Starting BCC reward distribution for all members...\n");

  try {
    // Get all members with a level > 0
    const allMembers = await db
      .select()
      .from(members)
      .where(eq(members.currentLevel, members.currentLevel)); // Get all members

    const membersWithLevel = allMembers.filter((m) => (m.currentLevel || 0) > 0);

    console.log(`Found ${membersWithLevel.length} members with membership levels`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const member of membersWithLevel) {
      try {
        const memberLevel = member.currentLevel || 0;
        
        if (memberLevel <= 0) {
          skippedCount++;
          continue;
        }

        // Get all existing BCC rewards for this member
        const existingRewards = await db
          .select()
          .from(rewards)
          .where(
            and(
              eq(rewards.recipientWallet, member.walletAddress.toLowerCase()),
              eq(rewards.rewardType, "bcc_token"),
              eq(rewards.currency, "BCC")
            )
          );

        // Award BCC rewards for ALL levels from 1 to current level (cumulative)
        // This ensures Level 2 members get 500 (Level 1) + 100 (Level 2) = 600 BCC total
        let awardedCount = 0;
        for (let level = 1; level <= memberLevel; level++) {
          // Check if reward for this specific level already exists
          const hasLevelReward = existingRewards.some(
            (r) => r.notes && r.notes.includes(`Level ${level} membership`)
          );

          if (!hasLevelReward) {
            // Award BCC reward for this level
            await awardBCCReward(
              member.walletAddress.toLowerCase(),
              level,
              undefined, // No source wallet for level-based reward
              `BCC reward for Level ${level} membership`
            );
            console.log(`  → Awarded ${MEMBERSHIP_LEVELS.find(l => l.level === level)?.bccReward || 0} BCC for Level ${level}`);
            awardedCount++;
          }
        }

        if (awardedCount > 0) {
          console.log(`✓ Member ${member.id} (${member.walletAddress}): Awarded BCC rewards for ${awardedCount} level(s) (Level 1 to ${memberLevel})`);
          successCount++;
        } else {
          console.log(`⊘ Member ${member.id} (${member.walletAddress}): All BCC rewards for Level 1-${memberLevel} already exist, skipping`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing member ${member.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nProcessed ${membersWithLevel.length} members:`);
    console.log(`  ✓ Successfully awarded: ${successCount}`);
    console.log(`  ⊘ Skipped (already exists): ${skippedCount}`);
    if (errorCount > 0) {
      console.log(`  ✗ Errors: ${errorCount}`);
    }

    console.log("\n✓ BCC reward distribution completed!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
awardBCCRewardsForAllMembers()
  .then(() => {
    console.log("\nScript completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

