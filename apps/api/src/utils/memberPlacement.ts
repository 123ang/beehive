// ============================================
// MEMBER PLACEMENT UTILITY
// Helper functions for creating members and placing them in the tree
// ============================================

import { db, members, users } from "../db";
import { eq } from "drizzle-orm";
import { matrixService } from "../services/MatrixService";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";

/**
 * Create a member and place them in the tree structure
 * Follows the Direct Sales Tree algorithm (3-wide, round-robin spillover)
 */
export async function createMemberWithPlacement(
  walletAddress: string,
  level: number = 1,
  sponsorWalletAddress?: string,
  username?: string
): Promise<{ memberId: number; placement: { parentId: number; position: number } | null }> {
  // Normalize wallet address
  const normalizedAddress = walletAddress.toLowerCase();

  // Check if member already exists
  const existing = await db.query.members.findFirst({
    where: eq(members.walletAddress, normalizedAddress),
  });

  if (existing) {
    throw new Error("Member already exists");
  }

  // Get or create sponsor
  let sponsorId: number | null = null;
  if (sponsorWalletAddress) {
    const sponsor = await db.query.members.findFirst({
      where: eq(members.walletAddress, sponsorWalletAddress.toLowerCase()),
    });

    if (!sponsor) {
      throw new Error("Sponsor not found");
    }

    sponsorId = sponsor.id;
  } else {
    // If no sponsor provided, find or create a root member
    // For now, we'll require a sponsor - this can be updated later if needed
    throw new Error("Sponsor is required for member placement");
  }

  // Find placement position using the Direct Sales Tree algorithm
  const placement = await matrixService.findPlacement(sponsorId);

  if (!placement) {
    throw new Error("No available placement position in sponsor's tree");
  }

  // Create member record
  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  const [newMember] = await db
    .insert(members)
    .values({
      walletAddress: normalizedAddress,
      username: username || null,
      currentLevel: level,
      totalInflow: levelInfo?.priceUSDT.toString() || "0",
      sponsorId: sponsorId,
    });

  // Get the inserted member ID (MySQL returns insertId)
  const [insertedMember] = await db
    .select()
    .from(members)
    .where(eq(members.walletAddress, normalizedAddress))
    .limit(1);

  // Place member in the tree
  await matrixService.placeMember(
    insertedMember.id,
    placement.parentId,
    placement.position,
    sponsorId
  );

  return {
    memberId: insertedMember.id,
    placement: {
      parentId: placement.parentId,
      position: placement.position,
    },
  };
}

/**
 * Create a member from an existing user record
 */
export async function createMemberFromUser(
  userId: number,
  level: number = 1,
  sponsorWalletAddress?: string
): Promise<{ memberId: number; placement: { parentId: number; position: number } | null }> {
  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if member already exists
  const existing = await db.query.members.findFirst({
    where: eq(members.walletAddress, user.walletAddress),
  });

  if (existing) {
    return {
      memberId: existing.id,
      placement: null, // Already placed
    };
  }

  // Create member with placement
  return createMemberWithPlacement(
    user.walletAddress,
    level,
    sponsorWalletAddress,
    user.username || undefined
  );
}

