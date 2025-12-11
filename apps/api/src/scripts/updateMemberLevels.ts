#!/usr/bin/env tsx
/**
 * Script to update member levels from members_update.csv
 * Reads the CSV file and updates the members and users tables with correct levels.
 */

import { db, members, users } from "../db/index.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import { join } from "path";

// Load environment variables
config({ path: "../../.env" });

interface MemberUpdate {
  wallet_address: string;
  referrer_wallet: string;
  current_level: number;
  activation_sequence: string;
  activation_time: string;
  total_nft_claimed: string;
}

async function updateMemberLevels() {
  console.log("=".repeat(60));
  console.log("Beehive Member Level Update Script");
  console.log("=".repeat(60));
  console.log();

  try {
    // Read and parse CSV file
    console.log("Reading members_update.csv...");
    const csvPath = join(process.cwd(), "..", "..", "members_update.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records: MemberUpdate[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        // Cast current_level to number
        if (context.column === "current_level") {
          return parseInt(value, 10) || 0;
        }
        return value;
      },
    });

    console.log(`✓ Found ${records.length} members to update\n`);

    let updatedMembers = 0;
    let updatedUsers = 0;
    let notFoundMembers = 0;
    let notFoundUsers = 0;
    const errors: Array<{ wallet: string; error: string }> = [];

    // Process each member
    console.log("Updating member levels...");
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const walletAddress = record.wallet_address.trim();
      const newLevel = record.current_level;

      if (!walletAddress) {
        continue;
      }

      try {
        // Check if member exists first
        const [existingMember] = await db
          .select({ id: members.id, currentLevel: members.currentLevel })
          .from(members)
          .where(eq(members.walletAddress, walletAddress))
          .limit(1);

        if (existingMember) {
          // Update existing member
          await db
            .update(members)
            .set({ currentLevel: newLevel })
            .where(eq(members.walletAddress, walletAddress));
          updatedMembers++;
        } else {
          // Insert new member
          await db.insert(members).values({
            walletAddress: walletAddress,
            currentLevel: newLevel,
            // Set other fields to defaults or null
            username: null,
            rootId: null,
            sponsorId: null,
            totalInflow: "0",
            totalOutflowUsdt: "0",
            totalOutflowBcc: 0,
            directSponsorCount: 0,
          });
          updatedMembers++;
        }

        // Check if user exists and update
        const [existingUser] = await db
          .select({ id: users.id, membershipLevel: users.membershipLevel })
          .from(users)
          .where(eq(users.walletAddress, walletAddress))
          .limit(1);

        if (existingUser) {
          // Update users table
          await db
            .update(users)
            .set({ membershipLevel: newLevel })
            .where(eq(users.walletAddress, walletAddress));
          updatedUsers++;
        } else {
          // User might not exist, which is okay
          notFoundUsers++;
        }

        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`  Processed ${i + 1}/${records.length} members...`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ wallet: walletAddress, error: errorMsg });
        console.error(`  ✗ Error updating ${walletAddress.substring(0, 20)}...: ${errorMsg}`);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("Update Summary");
    console.log("=".repeat(60));
    console.log(`Total records processed: ${records.length}`);
    console.log(`Members inserted/updated: ${updatedMembers}`);
    console.log(`Members skipped: ${notFoundMembers}`);
    console.log(`Users updated: ${updatedUsers}`);
    console.log(`Users not found (okay): ${notFoundUsers}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\nErrors encountered:");
      errors.slice(0, 10).forEach((err) => {
        console.log(`  - ${err.wallet.substring(0, 20)}...: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }

    console.log("\n✓ Update completed successfully!");
  } catch (error) {
    console.error("\n✗ Fatal error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the script
updateMemberLevels();

