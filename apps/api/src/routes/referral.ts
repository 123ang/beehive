import { Hono } from "hono";
import { db } from "../db";
import { members, users, referralRelationships } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateMemberId, generateReferralCode } from "../utils/referralCode";
import { logActivity, getClientIp, getUserAgent } from "../utils/activityLogger";
import { awardBCCReward } from "../utils/bccRewards";
import { createMemberWithPlacement } from "../utils/memberPlacement";

export const referralRoutes = new Hono();

/**
 * Generate referral code for user (called on wallet connect)
 * POST /api/referral/generate
 */
referralRoutes.post("/generate", async (c) => {
  try {
    const { walletAddress } = await c.req.json();

    if (!walletAddress) {
      return c.json({ error: "Wallet address required" }, 400);
    }

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!member) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Check if already has referral code
    if (member.referralCode) {
      return c.json({
        success: true,
        data: {
          referralCode: member.referralCode,
          memberId: member.memberId,
          referralLink: `${process.env.FRONTEND_URL || "https://beehive-lifestyle.io"}/register?ref=${member.referralCode}`,
        },
      });
    }

    // Generate member ID if not exists
    const memberId = member.memberId || generateMemberId(member.id);
    
    // Generate unique referral code (8 random lowercase alphanumeric)
    let finalReferralCode: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      finalReferralCode = generateReferralCode();
      attempts++;
      
      // Check if referral code already exists
      const [existingCode] = await db
        .select()
        .from(members)
        .where(eq(members.referralCode, finalReferralCode))
        .limit(1);
      
      if (!existingCode || existingCode.id === member.id) {
        break; // Unique code found or belongs to this member
      }
      
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
      }
    } while (true);

    // Update member
    await db
      .update(members)
      .set({ memberId, referralCode: finalReferralCode })
      .where(eq(members.id, member.id));

    // Log activity
    await logActivity({
      actorType: "user",
      actorId: walletAddress,
      action: "user.wallet_connected",
      metadata: { memberId, referralCode: finalReferralCode },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    return c.json({
      success: true,
      data: {
        referralCode: finalReferralCode,
        memberId,
        referralLink: `${process.env.FRONTEND_URL || "https://beehive-lifestyle.io"}/register?ref=${finalReferralCode}`,
      },
    });
  } catch (error) {
    console.error("Generate referral code error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Validate referral code
 * GET /api/referral/validate/:code
 */
referralRoutes.get("/validate/:code", async (c) => {
  try {
    const code = c.req.param("code");

    const [sponsor] = await db
      .select()
      .from(members)
      .where(eq(members.referralCode, code))
      .limit(1);

    if (!sponsor) {
      return c.json({ success: false, error: "Invalid referral code" }, 404);
    }

    return c.json({
      success: true,
      data: {
        valid: true,
        sponsor: {
          name: sponsor.username,
          memberId: sponsor.memberId,
        },
      },
    });
  } catch (error) {
    console.error("Validate referral code error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Register with referral code
 * POST /api/referral/register
 */
referralRoutes.post("/register", async (c) => {
  try {
    const { walletAddress, referralCode, email, name, phone } = await c.req.json();

    if (!walletAddress || !referralCode) {
      return c.json({ error: "Wallet address and referral code required" }, 400);
    }

    // Validate referral code - find sponsor in members table
    const [sponsor] = await db
      .select()
      .from(members)
      .where(eq(members.referralCode, referralCode))
      .limit(1);

    if (!sponsor) {
      return c.json({ error: "Invalid referral code" }, 400);
    }

    // Check if member already exists
    const [existingMember] = await db
      .select()
      .from(members)
      .where(eq(members.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (existingMember) {
      return c.json({ error: "Member already registered" }, 400);
    }

    // Create member with placement in the matrix
    const { memberId: newMemberId } = await createMemberWithPlacement(
      walletAddress.toLowerCase(),
      1, // Level 1
      sponsor.walletAddress, // Sponsor wallet
      name || undefined // Username
    );

    // Get the created member
    const [newMember] = await db
      .select()
      .from(members)
      .where(eq(members.id, newMemberId))
      .limit(1);

    if (!newMember) {
      return c.json({ error: "Failed to create member" }, 500);
    }

    // Generate member ID string if not exists
    const memberIdString = newMember.memberId || generateMemberId(newMember.id);
    
    // Generate unique referral code (8 random lowercase alphanumeric)
    let finalReferralCode: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      finalReferralCode = generateReferralCode();
      attempts++;
      
      // Check if referral code already exists
      const [existingCode] = await db
        .select()
        .from(members)
        .where(eq(members.referralCode, finalReferralCode))
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
        memberId: memberIdString,
        referralCode: finalReferralCode 
      })
      .where(eq(members.id, newMember.id));

    // Also create/update user record for consistency (for auth purposes)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          email: email || existingUser.email,
          name: name || existingUser.name,
          phone: phone || existingUser.phone,
          membershipLevel: 1,
          status: "active",
        })
        .where(eq(users.id, existingUser.id));
    } else {
      // Create new user record
      await db.insert(users).values({
        walletAddress: walletAddress.toLowerCase(),
        email: email || null,
        name: name || null,
        phone: phone || null,
        membershipLevel: 1,
        status: "active",
      });
    }

    // Award BCC rewards based on membership level (Level 1 = 500 BCC)
    await awardBCCReward(
      walletAddress.toLowerCase(),
      1, // Level 1 membership
      sponsor.walletAddress,
      "Registration BCC reward for Level 1 membership"
    );

    // Create referral relationship (using user ID if available, otherwise member ID)
    const [userForRelationship] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (userForRelationship) {
      // Find sponsor's user record
      const [sponsorUser] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, sponsor.walletAddress))
        .limit(1);

      if (sponsorUser) {
        await db.insert(referralRelationships).values({
          sponsorId: sponsorUser.id,
          referredUserId: userForRelationship.id,
          referralCodeUsed: referralCode,
          status: "active",
        });

        // Update sponsor's referral count
        await db
          .update(users)
          .set({
            referralCount: (sponsorUser.referralCount || 0) + 1,
          })
          .where(eq(users.id, sponsorUser.id));
      }
    }

    // Log activities
    await logActivity({
      actorType: "user",
      actorId: walletAddress,
      action: "user.register_with_referral",
      metadata: { sponsorId: sponsor.id, referralCode, memberId: newMember.id },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    await logActivity({
      actorType: "user",
      actorId: sponsor.walletAddress,
      action: "user.referred_new_user",
      metadata: { referredMemberId: newMember.id },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    return c.json({
      success: true,
      data: {
        memberId: newMember.id,
        memberIdString: memberIdString,
        referralCode: finalReferralCode,
      },
    });
  } catch (error) {
    console.error("Register with referral error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get user's referrals
 * GET /api/referral/my-referrals
 */
referralRoutes.get("/my-referrals", async (c) => {
  try {
    const walletAddress = c.req.header("X-Wallet-Address");

    if (!walletAddress) {
      return c.json({ error: "Wallet address required" }, 400);
    }

    // Find member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!member) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Find user for referral relationships (relationships table uses user IDs)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    // Get referral relationships if user exists
    let referrals = [];
    if (user) {
      const referralData = await db
        .select({
          id: referralRelationships.id,
          referredUserId: referralRelationships.referredUserId,
          referralDate: referralRelationships.referralDate,
          status: referralRelationships.status,
          referredUser: users,
        })
        .from(referralRelationships)
        .leftJoin(users, eq(referralRelationships.referredUserId, users.id))
        .where(eq(referralRelationships.sponsorId, user.id));
      
      referrals = referralData;
    }

    // Also get direct referrals from members table (sponsorId)
    const directReferrals = await db
      .select()
      .from(members)
      .where(eq(members.sponsorId, member.id));

    return c.json({
      success: true,
      data: {
        totalReferrals: directReferrals.length,
        referrals,
        directReferrals: directReferrals.map(m => ({
          id: m.id,
          walletAddress: m.walletAddress,
          username: m.username,
          currentLevel: m.currentLevel,
          joinedAt: m.joinedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get referrals error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

