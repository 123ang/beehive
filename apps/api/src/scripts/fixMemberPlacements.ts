// ============================================
// FIX MEMBER PLACEMENTS SCRIPT
// Recalculates and fixes member placements in the 3x3 matrix
// ============================================

import { db, members, placements, memberClosure } from "../db";
import { eq, and, sql, asc, isNull } from "drizzle-orm";
import { matrixService } from "../services/MatrixService";

interface MemberWithSponsor {
  id: number;
  walletAddress: string;
  sponsorId: number | null;
  joinedAt: Date;
}

/**
 * Fix member placements by recalculating them based on sponsor relationships
 */
async function fixMemberPlacements() {
  console.log("🔧 Starting member placement fix...\n");

  try {
    // Step 1: Get all members ordered by join date
    const allMembers = await db
      .select({
        id: members.id,
        walletAddress: members.walletAddress,
        sponsorId: members.sponsorId,
        joinedAt: members.joinedAt,
      })
      .from(members)
      .orderBy(asc(members.joinedAt), asc(members.id));

    console.log(`📊 Found ${allMembers.length} members to process\n`);

    // Step 2: Find root members (members without sponsors or with invalid sponsors)
    const rootMembers: number[] = [];
    for (const member of allMembers) {
      if (!member.sponsorId) {
        rootMembers.push(member.id);
        continue;
      }

      // Check if sponsor exists
      const sponsor = await db.query.members.findFirst({
        where: eq(members.id, member.sponsorId),
      });

      if (!sponsor) {
        console.log(`⚠️  Member ${member.id} has invalid sponsor ${member.sponsorId}, marking as root`);
        rootMembers.push(member.id);
        processedMembers.add(member.id);
        await db
          .update(members)
          .set({ sponsorId: null })
          .where(eq(members.id, member.id));
      }
    }

    console.log(`🌳 Found ${rootMembers.length} root member(s): ${rootMembers.join(", ")}\n`);

    // Step 3: Clear existing placements and closure table (except self-links for roots)
    console.log("🧹 Clearing existing placements and closure table...");
    
    // Delete all placements
    await db.delete(placements);
    console.log("   ✓ Cleared placements table");

    // Delete all closure entries (we'll rebuild them)
    await db.delete(memberClosure);
    console.log("   ✓ Cleared closure table");

    // Re-insert self-links for all members
    for (const member of allMembers) {
      try {
        await db.insert(memberClosure).values({
          ancestorId: member.id,
          descendantId: member.id,
          depth: 0,
        });
      } catch (error: any) {
        // Ignore duplicate errors
        if (!error.message?.includes("Duplicate entry")) {
          throw error;
        }
      }
    }
    console.log("   ✓ Re-inserted self-links\n");

    // Step 4: Process members in order and place them
    let placedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ memberId: number; error: string }> = [];

    for (const member of allMembers) {
      // Skip root members (they don't need placement)
      if (rootMembersSet.has(member.id)) {
        // Set root_id to self for root members
        await db
          .update(members)
          .set({ rootId: member.id })
          .where(eq(members.id, member.id));
        skippedCount++;
        continue;
      }

      if (!member.sponsorId) {
        console.log(`⚠️  Member ${member.id} has no sponsor, skipping`);
        skippedCount++;
        continue;
      }

      try {
        // Find placement using the matrix service
        const placement = await matrixService.findPlacement(member.sponsorId);

        if (!placement) {
          console.log(`⚠️  No placement found for member ${member.id}, skipping`);
          skippedCount++;
          continue;
        }

        // Place the member
        await matrixService.placeMember(
          member.id,
          placement.parentId,
          placement.position,
          member.sponsorId
        );

        placedCount++;
        if (placedCount % 10 === 0) {
          console.log(`   ✓ Placed ${placedCount} members...`);
        }
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        console.error(`❌ Error placing member ${member.id}: ${errorMsg}`);
        errors.push({ memberId: member.id, error: errorMsg });
      }
    }

    console.log(`\n✅ Placement fix completed!`);
    console.log(`   - Placed: ${placedCount} members`);
    console.log(`   - Skipped: ${skippedCount} members (roots or invalid)`);
    console.log(`   - Errors: ${errors.length} members`);

    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach(({ memberId, error }) => {
        console.log(`   Member ${memberId}: ${error}`);
      });
    }

    // Step 5: Verify placements
    console.log(`\n🔍 Verifying placements...`);
    const placementCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(placements);
    console.log(`   ✓ Total placements: ${placementCount[0]?.count || 0}`);

    const closureCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(memberClosure);
    console.log(`   ✓ Total closure entries: ${closureCount[0]?.count || 0}`);

    // Check for members with more than 3 children (shouldn't happen)
    const invalidParents = await db.execute(sql`
      SELECT parent_id, COUNT(*) as child_count
      FROM placements
      GROUP BY parent_id
      HAVING child_count > 3
    `);

    if (Array.isArray(invalidParents) && invalidParents.length > 0) {
      console.log(`\n⚠️  Warning: Found parents with more than 3 children:`);
      console.log(invalidParents);
    } else {
      console.log(`   ✓ All parents have ≤ 3 children`);
    }

    console.log(`\n✨ Done!`);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
fixMemberPlacements()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

export { fixMemberPlacements };

