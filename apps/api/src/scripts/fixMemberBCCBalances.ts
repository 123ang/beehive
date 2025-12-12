/**
 * Script to fix member BCC balances by recalculating from rewards table
 * Members with truncated balances (0.999999999999999999 or 1) need to be recalculated
 * 
 * Run: pnpm --filter @beehive/api db:fix-member-bcc-balances
 */

// Load environment variables
import { config } from "dotenv";
config({ path: "../../.env" });

import { db } from "../db/index.js";
import { members, rewards } from "../db/schema.js";
import { eq, sql, and } from "drizzle-orm";

async function fixMemberBCCBalances() {
  console.log("Starting member BCC balance fix...\n");

  try {
    // Get all members
    const allMembers = await db
      .select()
      .from(members);

    console.log(`Found ${allMembers.length} total members`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const member of allMembers) {
      try {
        const currentBalance = parseFloat(member.bccBalance?.toString() || "0");
        const balanceString = member.bccBalance?.toString() || "0";
        
        // Check if balance is truncated (between 0.9 and 1.0, or exactly 1, or contains many 9s)
        const isTruncated = 
          (currentBalance >= 0.9 && currentBalance < 1.0) ||
          (currentBalance === 1 && member.currentLevel && member.currentLevel > 0) || // Level > 0 but balance is only 1
          (balanceString.includes("0.999") && balanceString.length > 5);

        if (!isTruncated && currentBalance > 1) {
          // Balance looks correct (greater than 1)
          skippedCount++;
          continue;
        }

        // Recalculate BCC balance from rewards table
        // Sum all BCC rewards for this member
        const bccRewards = await db
          .select({
            total: sql<number>`COALESCE(SUM(CAST(${rewards.amount} AS DECIMAL(36,18))), 0)`.as("total"),
          })
          .from(rewards)
          .where(
            and(
              eq(rewards.recipientWallet, member.walletAddress.toLowerCase()),
              eq(rewards.currency, "BCC"),
              eq(rewards.rewardType, "bcc_token")
            )
          );

        const calculatedBalance = parseFloat(bccRewards[0]?.total?.toString() || "0");

        if (calculatedBalance === currentBalance && !isTruncated) {
          // Balance is already correct
          skippedCount++;
          continue;
        }

        // Update the member's BCC balance
        await db
          .update(members)
          .set({
            bccBalance: calculatedBalance.toString(),
          })
          .where(eq(members.id, member.id));

        console.log(
          `✓ Member ${member.id} (${member.walletAddress.slice(0, 10)}...): Updated BCC balance from ${currentBalance} to ${calculatedBalance}`
        );

        fixedCount++;
      } catch (error) {
        console.error(`✗ Error processing member ${member.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nProcessed ${allMembers.length} members:`);
    console.log(`  ✓ Fixed: ${fixedCount}`);
    console.log(`  ⊘ Skipped (already correct): ${skippedCount}`);
    if (errorCount > 0) {
      console.log(`  ✗ Errors: ${errorCount}`);
    }

    console.log("\n✓ Member BCC balance fix completed!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
fixMemberBCCBalances()
  .then(() => {
    console.log("\nScript completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

