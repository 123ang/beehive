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
  memberId?: number; // Optional: if provided, will use this instead of looking up
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
    
    let memberId: number | null = null;
    
    // If memberId is provided and is a valid number, use it directly
    if (data.memberId !== undefined && data.memberId !== null && typeof data.memberId === 'number' && data.memberId > 0) {
      memberId = data.memberId;
      console.log(`📝 Using provided memberId: ${memberId} for activity ${data.activityType}`);
    } else {
      // Otherwise, look up member ID from wallet address
      console.log(`🔍 Looking up memberId for wallet ${normalizedWallet}...`);
      const member = await db.query.members.findFirst({
        where: eq(members.walletAddress, normalizedWallet),
        columns: { id: true },
      });
      
      if (member?.id) {
        memberId = member.id;
        console.log(`✅ Found memberId: ${memberId} for wallet ${normalizedWallet}`);
      } else {
        console.warn(`⚠️ Member not found in database for wallet ${normalizedWallet}`);
        memberId = null;
      }
    }

    if (!memberId) {
      console.warn(`⚠️ Member ID not found for wallet ${normalizedWallet} when logging activity ${data.activityType}. Activity will be logged without memberId.`);
    }

    await db.insert(memberActivityLogs).values({
      walletAddress: normalizedWallet,
      memberId: memberId,
      activityType: data.activityType,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });

    console.log(`✅ Logged member activity: ${data.activityType} for member ${memberId || 'unknown'} (${normalizedWallet})`);
  } catch (error) {
    console.error(`❌ Failed to log member activity for ${data.walletAddress}:`, error);
    // Don't throw error to prevent disrupting main flow
  }
}

