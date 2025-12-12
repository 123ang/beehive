/**
 * Script to generate referral codes for all members who don't have one
 * Run: pnpm --filter @beehive/api db:generate-referral-codes
 */

// Load environment variables
import { config } from "dotenv";
config({ path: "../../.env" });

import { db } from "../db/index.js";
import { members } from "../db/schema.js";
import { generateMemberId, generateReferralCode } from "../utils/referralCode.js";
import { eq, isNull } from "drizzle-orm";

async function generateReferralCodesForAllMembers() {
  console.log("Starting referral code generation for all members...\n");

  try {
    // Get all members without referral codes
    const membersWithoutCodes = await db
      .select()
      .from(members)
      .where(isNull(members.referralCode));

    console.log(`Found ${membersWithoutCodes.length} members without referral codes`);

    let successCount = 0;
    let errorCount = 0;

    for (const member of membersWithoutCodes) {
      try {
        // Generate member ID if not exists
        const memberId = member.memberId || generateMemberId(member.id);
        
        // Generate unique referral code (8 random lowercase alphanumeric)
        let referralCode: string;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
          referralCode = generateReferralCode();
          attempts++;
          
          // Check if referral code already exists
          const [existingCode] = await db
            .select()
            .from(members)
            .where(eq(members.referralCode, referralCode))
            .limit(1);
          
          if (!existingCode) {
            break; // Unique code found
          }
          
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
          }
        } while (true);

        // Update member with member ID and referral code
        await db
          .update(members)
          .set({
            memberId,
            referralCode,
          })
          .where(eq(members.id, member.id));
        
        console.log(`✓ Member ${member.id} (${member.walletAddress}): ${referralCode}`);

        successCount++;
      } catch (error) {
        console.error(`✗ Error processing member ${member.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nProcessed ${successCount} users successfully`);
    if (errorCount > 0) {
      console.log(`Encountered ${errorCount} errors`);
    }

    console.log("\n✓ Referral code generation completed!");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
generateReferralCodesForAllMembers()
  .then(() => {
    console.log("\nScript completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

