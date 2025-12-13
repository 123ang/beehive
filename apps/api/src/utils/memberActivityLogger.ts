import { db } from "../db";
import { memberActivityLogs, members } from "../db/schema";
import { eq } from "drizzle-orm";

export type MemberActivityType = 
  | "purchase_membership" 
  | "register" 
  | "withdrawal" 
  | "enroll_class" 
  | "purchase_nft";

export interface MemberActivityData {
  walletAddress: string;
  activityType: MemberActivityType;
  metadata?: Record<string, any>;
}

/**
 * Log a member activity to the database
 * Automatically fetches memberId from wallet address
 * 
 * Activity types:
 * - purchase_membership: When a member upgrades their membership level
 * - register: When a new member registers (Level 1 purchase)
 * - withdrawal: When a member withdraws USDT or BCC
 * - enroll_class: When a member enrolls in an education class (TODO: implement when class enrollment is added)
 * - purchase_nft: When a member purchases an NFT (TODO: implement when NFT purchase endpoint is added)
 */
export async function logMemberActivity(data: MemberActivityData) {
  try {
    const normalizedWallet = data.walletAddress.toLowerCase();
    
    // Get member ID from wallet address
    const member = await db.query.members.findFirst({
      where: eq(members.walletAddress, normalizedWallet),
      columns: { id: true },
    });

    await db.insert(memberActivityLogs).values({
      walletAddress: normalizedWallet,
      memberId: member?.id || null,
      activityType: data.activityType,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  } catch (error) {
    console.error("Failed to log member activity:", error);
    // Don't throw error to prevent disrupting main flow
  }
}

