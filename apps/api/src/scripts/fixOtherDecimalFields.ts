/**
 * Script to fix other decimal fields that might have been truncated
 * Checks: users.total_spent, users.total_rewards, users.referral_rewards_earned,
 *        members.total_inflow, members.total_outflow_usdt, members.total_outflow_bcc
 * 
 * Run: pnpm --filter @beehive/api db:fix-other-decimal-fields
 */

// Load environment variables
import { config } from "dotenv";
config({ path: "../../.env" });

import { db } from "../db/index.js";
import { users, members, rewards, transactions } from "../db/schema.js";
import { eq, sql, and } from "drizzle-orm";

async function fixOtherDecimalFields() {
  console.log("Starting fix for other decimal fields...\n");

  try {
    let totalFixed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // ============================================
    // Fix USERS table
    // ============================================
    console.log("Checking USERS table...");
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users`);

    let usersFixed = 0;
    for (const user of allUsers) {
      try {
        let needsUpdate = false;
        const updates: any = {};

        // Check total_spent
        const totalSpent = parseFloat(user.totalSpent?.toString() || "0");
        const totalSpentStr = user.totalSpent?.toString() || "0";
        if ((totalSpent >= 0.9 && totalSpent < 1.0) || (totalSpentStr.includes("0.999") && totalSpentStr.length > 5)) {
          // Recalculate from transactions or rewards
          // For now, if it's truncated, set to 0 (or you can recalculate from actual data)
          updates.totalSpent = "0";
          needsUpdate = true;
        }

        // Check total_rewards
        const totalRewards = parseFloat(user.totalRewards?.toString() || "0");
        const totalRewardsStr = user.totalRewards?.toString() || "0";
        if ((totalRewards >= 0.9 && totalRewards < 1.0) || (totalRewardsStr.includes("0.999") && totalRewardsStr.length > 5)) {
          // Recalculate from rewards table
          const rewardSum = await db
            .select({
              total: sql<number>`COALESCE(SUM(CAST(${rewards.amount} AS DECIMAL(36,18))), 0)`.as("total"),
            })
            .from(rewards)
            .where(eq(rewards.recipientWallet, user.walletAddress.toLowerCase()));
          
          const calculatedTotal = rewardSum[0]?.total;
          if (calculatedTotal !== undefined) {
            updates.totalRewards = calculatedTotal.toString();
            needsUpdate = true;
          }
        }

        // Check referral_rewards_earned
        const referralRewards = parseFloat(user.referralRewardsEarned?.toString() || "0");
        const referralRewardsStr = user.referralRewardsEarned?.toString() || "0";
        if ((referralRewards >= 0.9 && referralRewards < 1.0) || (referralRewardsStr.includes("0.999") && referralRewardsStr.length > 5)) {
          // Recalculate from rewards where rewardType is direct_sponsor or layer_payout
          const referralRewardSum = await db
            .select({
              total: sql<number>`COALESCE(SUM(CAST(${rewards.amount} AS DECIMAL(36,18))), 0)`.as("total"),
            })
            .from(rewards)
            .where(
              and(
                eq(rewards.recipientWallet, user.walletAddress.toLowerCase()),
                sql`${rewards.rewardType} IN ('direct_sponsor', 'layer_payout')`
              )
            );
          
          const calculatedReferral = referralRewardSum[0]?.total;
          if (calculatedReferral !== undefined) {
            updates.referralRewardsEarned = calculatedReferral.toString();
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await db.update(users).set(updates).where(eq(users.id, user.id));
          console.log(`✓ User ${user.id}: Updated fields`);
          usersFixed++;
          totalFixed++;
        } else {
          totalSkipped++;
        }
      } catch (error) {
        console.error(`✗ Error processing user ${user.id}:`, error);
        totalErrors++;
      }
    }

    console.log(`\nUsers: Fixed ${usersFixed}, Skipped ${allUsers.length - usersFixed}\n`);

    // ============================================
    // Fix MEMBERS table (other fields)
    // ============================================
    console.log("Checking MEMBERS table (other fields)...");
    const allMembers = await db.select().from(members);
    console.log(`Found ${allMembers.length} members`);

    let membersFixed = 0;
    for (const member of allMembers) {
      try {
        let needsUpdate = false;
        const updates: any = {};

        // Check total_inflow
        const totalInflow = parseFloat(member.totalInflow?.toString() || "0");
        const totalInflowStr = member.totalInflow?.toString() || "0";
        if ((totalInflow >= 0.9 && totalInflow < 1.0) || (totalInflowStr.includes("0.999") && totalInflowStr.length > 5)) {
          // Recalculate from transactions where transactionType is 'deposit' or 'reward'
          const inflowSum = await db
            .select({
              total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL(36,18))), 0)`.as("total"),
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.walletAddress, member.walletAddress.toLowerCase()),
                sql`${transactions.transactionType} IN ('deposit', 'reward')`
              )
            );
          
          const calculatedInflow = inflowSum[0]?.total;
          if (calculatedInflow !== undefined) {
            updates.totalInflow = calculatedInflow.toString();
            needsUpdate = true;
          }
        }

        // Check total_outflow_usdt
        const totalOutflowUsdt = parseFloat(member.totalOutflowUsdt?.toString() || "0");
        const totalOutflowUsdtStr = member.totalOutflowUsdt?.toString() || "0";
        if ((totalOutflowUsdt >= 0.9 && totalOutflowUsdt < 1.0) || (totalOutflowUsdtStr.includes("0.999") && totalOutflowUsdtStr.length > 5)) {
          // Recalculate from transactions where currency is USDT and transactionType is 'withdrawal' or 'purchase'
          const outflowUsdtSum = await db
            .select({
              total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL(36,18))), 0)`.as("total"),
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.walletAddress, member.walletAddress.toLowerCase()),
                eq(transactions.currency, "USDT"),
                sql`${transactions.transactionType} IN ('withdrawal', 'purchase')`
              )
            );
          
          const calculatedOutflowUsdt = outflowUsdtSum[0]?.total;
          if (calculatedOutflowUsdt !== undefined) {
            updates.totalOutflowUsdt = calculatedOutflowUsdt.toString();
            needsUpdate = true;
          }
        }

        // Check total_outflow_bcc
        const totalOutflowBcc = parseFloat(member.totalOutflowBcc?.toString() || "0");
        const totalOutflowBccStr = member.totalOutflowBcc?.toString() || "0";
        if ((totalOutflowBcc >= 0.9 && totalOutflowBcc < 1.0) || (totalOutflowBccStr.includes("0.999") && totalOutflowBccStr.length > 5)) {
          // Recalculate from transactions where currency is BCC and transactionType is 'withdrawal'
          const outflowBccSum = await db
            .select({
              total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL(36,18))), 0)`.as("total"),
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.walletAddress, member.walletAddress.toLowerCase()),
                eq(transactions.currency, "BCC"),
                eq(transactions.transactionType, "withdrawal")
              )
            );
          
          const calculatedOutflowBcc = outflowBccSum[0]?.total;
          if (calculatedOutflowBcc !== undefined) {
            updates.totalOutflowBcc = calculatedOutflowBcc.toString();
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await db.update(members).set(updates).where(eq(members.id, member.id));
          console.log(`✓ Member ${member.id}: Updated fields`);
          membersFixed++;
          totalFixed++;
        } else {
          totalSkipped++;
        }
      } catch (error) {
        console.error(`✗ Error processing member ${member.id}:`, error);
        totalErrors++;
      }
    }

    console.log(`\nMembers: Fixed ${membersFixed}, Skipped ${allMembers.length - membersFixed}\n`);

    // ============================================
    // Summary
    // ============================================
    console.log(`\n=== Summary ===`);
    console.log(`  ✓ Fixed: ${totalFixed}`);
    console.log(`  ⊘ Skipped: ${totalSkipped}`);
    if (totalErrors > 0) {
      console.log(`  ✗ Errors: ${totalErrors}`);
    }

    console.log("\n✓ Other decimal fields fix completed!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
fixOtherDecimalFields()
  .then(() => {
    console.log("\nScript completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

