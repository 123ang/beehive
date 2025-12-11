#!/usr/bin/env tsx
/**
 * Migration script to build tree structure for existing members from members.csv
 * This script:
 * 1. Reads members.csv to get referrer relationships
 * 2. Creates a root member if needed
 * 3. Places all members in the tree using the Direct Sales Tree algorithm
 * 4. Updates the closure table
 */

import { db, members, placements, memberClosure } from "../db/index.js";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import { matrixService } from "../services/MatrixService.js";
import { join } from "path";

// Load environment variables
config({ path: "../../.env" });

interface MemberRecord {
  wallet_address: string;
  referrer_wallet: string;
  current_level: number;
  activation_sequence: string;
  activation_time: string;
  total_nft_claimed: string;
}

async function buildTreeFromCSV() {
  console.log("=".repeat(60));
  console.log("Building Tree Structure from members.csv");
  console.log("=".repeat(60));
  console.log();

  try {
    // Read members.csv
    console.log("Reading members.csv...");
    const csvPath = join(process.cwd(), "..", "..", "members.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    const records: MemberRecord[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        if (context.column === "current_level") {
          return parseInt(value, 10) || 0;
        }
        return value;
      },
    });

    console.log(`✓ Found ${records.length} members in CSV\n`);

    // Check if tree already exists
    const existingPlacements = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(placements);

    if (existingPlacements[0]?.count > 0) {
      console.log("⚠️  Tree structure already exists!");
      console.log(`   Found ${existingPlacements[0].count} existing placements`);
      console.log("   This script will skip members that are already placed.\n");
    }

    // Create a map of wallet -> member ID from database
    console.log("Loading existing members from database...");
    const allMembers = await db.select().from(members);
    const walletToMemberId = new Map<string, number>();
    const memberIdToWallet = new Map<number, string>();

    for (const member of allMembers) {
      walletToMemberId.set(member.walletAddress.toLowerCase(), member.id);
      memberIdToWallet.set(member.id, member.walletAddress);
    }

    console.log(`✓ Loaded ${allMembers.length} members from database\n`);

    // Find or create root member (first member with self-referrer)
    let rootMemberId: number | null = null;
    const rootRecord = records.find(
      (r) => r.wallet_address.toLowerCase() === r.referrer_wallet.toLowerCase()
    );

    if (rootRecord) {
      rootMemberId = walletToMemberId.get(rootRecord.wallet_address.toLowerCase()) || null;
      if (rootMemberId) {
        console.log(`✓ Found root member: ${rootRecord.wallet_address} (ID: ${rootMemberId})\n`);
      }
    }

    if (!rootMemberId && allMembers.length > 0) {
      // Use first member as root if no self-referrer found
      rootMemberId = allMembers[0].id;
      console.log(`⚠️  No self-referrer found, using first member as root (ID: ${rootMemberId})\n`);
    }

    // Sort records by activation_sequence to process in order
    const sortedRecords = [...records].sort((a, b) => {
      const seqA = parseInt(a.activation_sequence) || 0;
      const seqB = parseInt(b.activation_sequence) || 0;
      return seqA - seqB;
    });

    let placed = 0;
    let skipped = 0;
    let errors = 0;
    const errorsList: Array<{ wallet: string; error: string }> = [];

    console.log("Building tree structure...\n");

    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];
      const walletAddress = record.wallet_address.toLowerCase();
      const referrerWallet = record.referrer_wallet.toLowerCase();

      try {
        const memberId = walletToMemberId.get(walletAddress);
        if (!memberId) {
          console.log(`  ⚠️  Member not found in database: ${walletAddress.substring(0, 20)}...`);
          skipped++;
          continue;
        }

        // Check if already placed
        const [existingPlacement] = await db
          .select()
          .from(placements)
          .where(eq(placements.childId, memberId))
          .limit(1);

        if (existingPlacement) {
          skipped++;
          if ((i + 1) % 100 === 0) {
            console.log(`  Processed ${i + 1}/${sortedRecords.length}... (${placed} placed, ${skipped} skipped)`);
          }
          continue;
        }

        // Determine sponsor
        let sponsorId: number | null = null;

        if (walletAddress === referrerWallet) {
          // Self-referrer = root member
          if (memberId === rootMemberId) {
            // This is the root, place it without a parent
            // Insert self-link in closure table
            try {
              await db.insert(memberClosure).values({
                ancestorId: memberId,
                descendantId: memberId,
                depth: 0,
              });
            } catch (error: any) {
              if (!error.message?.includes("Duplicate entry")) {
                throw error;
              }
            }

            // Update root_id
            await db
              .update(members)
              .set({ rootId: memberId })
              .where(eq(members.id, memberId));

            placed++;
            if ((i + 1) % 100 === 0) {
              console.log(`  Processed ${i + 1}/${sortedRecords.length}... (${placed} placed, ${skipped} skipped)`);
            }
            continue;
          } else {
            // Use root as sponsor
            sponsorId = rootMemberId;
          }
        } else {
          // Find referrer in database
          sponsorId = walletToMemberId.get(referrerWallet) || null;

          if (!sponsorId) {
            // Referrer not found, use root as sponsor
            console.log(`  ⚠️  Referrer not found for ${walletAddress.substring(0, 20)}..., using root`);
            sponsorId = rootMemberId;
          }
        }

        if (!sponsorId) {
          throw new Error("No sponsor available");
        }

        // Find placement using the Direct Sales Tree algorithm
        const placement = await matrixService.findPlacement(sponsorId);

        if (!placement) {
          throw new Error("No available placement position");
        }

        // Place member in tree
        await matrixService.placeMember(memberId, placement.parentId, placement.position, sponsorId);

        placed++;

        if ((i + 1) % 100 === 0) {
          console.log(`  Processed ${i + 1}/${sortedRecords.length}... (${placed} placed, ${skipped} skipped)`);
        }
      } catch (error: any) {
        errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errorsList.push({ wallet: walletAddress, error: errorMsg });
        console.error(`  ✗ Error processing ${walletAddress.substring(0, 20)}...: ${errorMsg}`);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));
    console.log(`Total records processed: ${sortedRecords.length}`);
    console.log(`Members placed in tree: ${placed}`);
    console.log(`Members skipped (already placed): ${skipped}`);
    console.log(`Errors: ${errors}`);

    if (errorsList.length > 0) {
      console.log("\nErrors encountered:");
      errorsList.slice(0, 10).forEach((err) => {
        console.log(`  - ${err.wallet.substring(0, 20)}...: ${err.error}`);
      });
      if (errorsList.length > 10) {
        console.log(`  ... and ${errorsList.length - 10} more errors`);
      }
    }

    console.log("\n✓ Tree structure build completed!");
  } catch (error) {
    console.error("\n✗ Fatal error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
buildTreeFromCSV();

