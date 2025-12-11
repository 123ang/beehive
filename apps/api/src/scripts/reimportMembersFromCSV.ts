// ============================================
// REIMPORT MEMBERS FROM CSV SCRIPT
// Reimports members from members_update.csv
// Sets joined_at = activation_time
// Places members in 3x3 matrix structure
// ============================================

import { db, members, placements, memberClosure, users } from "../db";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import { matrixService } from "../services/MatrixService";
import { join } from "path";
import { generateMemberId } from "../utils/referralCode";

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

/**
 * Parse date string in format "M/D/YYYY H:MM" or "M/D/YYYY H:MM:SS"
 */
function parseActivationTime(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") {
    return null;
  }

  try {
    // Handle format like "3/1/2025 0:01" or "1/1/1970 0:00"
    const parts = dateStr.trim().split(" ");
    if (parts.length < 2) {
      return null;
    }

    const datePart = parts[0].split("/");
    const timePart = parts[1].split(":");

    if (datePart.length !== 3) {
      return null;
    }

    const month = parseInt(datePart[0], 10);
    const day = parseInt(datePart[1], 10);
    const year = parseInt(datePart[2], 10);
    const hour = parseInt(timePart[0] || "0", 10);
    const minute = parseInt(timePart[1] || "0", 10);
    const second = parseInt(timePart[2] || "0", 10);

    // Create date in UTC
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    // Validate date
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`, error);
    return null;
  }
}

async function reimportMembersFromCSV() {
  console.log("=".repeat(80));
  console.log("Reimporting Members from members_update.csv");
  console.log("Setting joined_at = activation_time");
  console.log("=".repeat(80));
  console.log();

  try {
    // Read members_update.csv
    console.log("📖 Reading members_update.csv...");
    const csvPath = join(process.cwd(), "..", "..", "members_update.csv");
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

    // Step 1: Clear existing placements and closure (we'll rebuild)
    console.log("🧹 Clearing existing placements and closure table...");
    await db.delete(placements);
    console.log("   ✓ Cleared placements table");
    await db.delete(memberClosure);
    console.log("   ✓ Cleared closure table");
    console.log();

    // Step 2: Process records in activation_sequence order
    const sortedRecords = [...records].sort((a, b) => {
      const seqA = parseInt(a.activation_sequence) || 0;
      const seqB = parseInt(b.activation_sequence) || 0;
      return seqA - seqB;
    });

    let created = 0;
    let updated = 0;
    let placed = 0;
    let skipped = 0;
    let errors = 0;
    const errorsList: Array<{ wallet: string; error: string }> = [];

    // Find root member (self-referrer)
    const rootRecord = sortedRecords.find(
      (r) => r.wallet_address.toLowerCase() === r.referrer_wallet.toLowerCase()
    );

    if (!rootRecord) {
      console.error("❌ No root member found (member with self-referrer)");
      process.exit(1);
    }

    console.log(`🌳 Root member: ${rootRecord.wallet_address}\n`);

    // Create a map to track wallet -> member ID
    const walletToMemberId = new Map<string, number>();

    console.log("📝 Processing members...\n");

    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];
      const walletAddress = record.wallet_address.toLowerCase();
      const referrerWallet = record.referrer_wallet.toLowerCase();
      const activationTime = parseActivationTime(record.activation_time);
      const currentLevel = parseInt(record.current_level) || 0;

      try {
        // Check if member already exists
        const existingMember = await db.query.members.findFirst({
          where: eq(members.walletAddress, walletAddress),
        });

        let memberId: number;

        if (existingMember) {
          // Update existing member
          const updateData: any = {
            currentLevel: currentLevel,
            sponsorId: null, // Will be set during placement
          };

          if (activationTime) {
            updateData.joinedAt = activationTime;
          }

          await db
            .update(members)
            .set(updateData)
            .where(eq(members.id, existingMember.id));

          memberId = existingMember.id;
          updated++;
        } else {
          // Create new member
          const insertResult = await db
            .insert(members)
            .values({
              walletAddress: walletAddress,
              currentLevel: currentLevel,
              sponsorId: null, // Will be set during placement
              joinedAt: activationTime || new Date(),
            });

          // Get the inserted ID (MySQL returns insertId)
          const [insertedMember] = await db
            .select({ id: members.id })
            .from(members)
            .where(eq(members.walletAddress, walletAddress))
            .limit(1);

          if (!insertedMember) {
            throw new Error("Failed to create member");
          }

          memberId = insertedMember.id;
          created++;

          // Also create user record if it doesn't exist
          const existingUser = await db.query.users.findFirst({
            where: eq(users.walletAddress, walletAddress),
          });

          if (!existingUser) {
            await db.insert(users).values({
              walletAddress: walletAddress,
              membershipLevel: currentLevel,
              status: "active",
              isBulkImported: true,
              memberId: generateMemberId(memberId),
            });

            // Update user with correct member ID
            const [createdUser] = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.walletAddress, walletAddress))
              .limit(1);

            if (createdUser) {
              await db
                .update(users)
                .set({ memberId: generateMemberId(createdUser.id) })
                .where(eq(users.id, createdUser.id));
            }
          }
        }

        walletToMemberId.set(walletAddress, memberId);

        // Handle root member (self-referrer)
        if (walletAddress === referrerWallet) {
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
            console.log(`  Processed ${i + 1}/${sortedRecords.length}... (${created} created, ${updated} updated, ${placed} placed)`);
          }
          continue;
        }

        // Find sponsor
        let sponsorId: number | null = null;

        if (walletAddress !== referrerWallet) {
          sponsorId = walletToMemberId.get(referrerWallet) || null;

          if (!sponsorId) {
            // Referrer not processed yet, use root
            console.log(`  ⚠️  Referrer ${referrerWallet.substring(0, 20)}... not found for ${walletAddress.substring(0, 20)}..., using root`);
            sponsorId = walletToMemberId.get(rootRecord.wallet_address.toLowerCase()) || null;
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
          console.log(`  Processed ${i + 1}/${sortedRecords.length}... (${created} created, ${updated} updated, ${placed} placed)`);
        }
      } catch (error: any) {
        errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errorsList.push({ wallet: walletAddress, error: errorMsg });
        console.error(`  ✗ Error processing ${walletAddress.substring(0, 20)}...: ${errorMsg}`);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 Reimport Summary");
    console.log("=".repeat(80));
    console.log(`Total records processed: ${sortedRecords.length}`);
    console.log(`Members created: ${created}`);
    console.log(`Members updated: ${updated}`);
    console.log(`Members placed in tree: ${placed}`);
    console.log(`Errors: ${errors}`);

    if (errorsList.length > 0) {
      console.log("\n❌ Errors encountered:");
      errorsList.slice(0, 20).forEach((err) => {
        console.log(`  - ${err.wallet.substring(0, 30)}...: ${err.error}`);
      });
      if (errorsList.length > 20) {
        console.log(`  ... and ${errorsList.length - 20} more errors`);
      }
    }

    // Verify placements
    console.log("\n🔍 Verifying placements...");
    const placementCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(placements);
    console.log(`   ✓ Total placements: ${placementCount[0]?.count || 0}`);

    const closureCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(memberClosure);
    console.log(`   ✓ Total closure entries: ${closureCount[0]?.count || 0}`);

    console.log("\n✅ Reimport completed!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
reimportMembersFromCSV();

