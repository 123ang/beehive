import { Hono } from "hono";
import { db } from "../db";
import { users, referralRelationships } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateMemberId, generateReferralCode } from "../utils/referralCode";
import { logActivity, getClientIp, getUserAgent } from "../utils/activityLogger";

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

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if already has referral code
    if (user.referralCode) {
      return c.json({
        success: true,
        data: {
          referralCode: user.referralCode,
          memberId: user.memberId,
          referralLink: `${process.env.FRONTEND_URL || "https://beehive-lifestyle.io"}/register?ref=${user.referralCode}`,
        },
      });
    }

    // Generate member ID and referral code
    const memberId = user.memberId || generateMemberId(user.id);
    const referralCode = generateReferralCode(memberId);

    // Update user
    await db
      .update(users)
      .set({ memberId, referralCode })
      .where(eq(users.id, user.id));

    // Log activity
    await logActivity({
      actorType: "user",
      actorId: walletAddress,
      action: "user.wallet_connected",
      metadata: { memberId, referralCode },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    return c.json({
      success: true,
      data: {
        referralCode,
        memberId,
        referralLink: `${process.env.FRONTEND_URL || "https://beehive-lifestyle.io"}/register?ref=${referralCode}`,
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
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);

    if (!sponsor) {
      return c.json({ success: false, error: "Invalid referral code" }, 404);
    }

    return c.json({
      success: true,
      data: {
        valid: true,
        sponsor: {
          name: sponsor.name,
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

    // Validate referral code
    const [sponsor] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (!sponsor) {
      return c.json({ error: "Invalid referral code" }, 400);
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return c.json({ error: "User already registered" }, 400);
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        walletAddress: walletAddress.toLowerCase(),
        email: email || null,
        name: name || null,
        phone: phone || null,
        membershipLevel: 1,
        status: "active",
        sponsorId: sponsor.id,
        sponsorAddress: sponsor.walletAddress,
      })
      .$returningId();

    // Generate member ID and referral code for new user
    const memberId = generateMemberId(newUser.id);
    const newReferralCode = generateReferralCode(memberId);

    await db
      .update(users)
      .set({ memberId, referralCode: newReferralCode })
      .where(eq(users.id, newUser.id));

    // Create referral relationship
    await db.insert(referralRelationships).values({
      sponsorId: sponsor.id,
      referredUserId: newUser.id,
      referralCodeUsed: referralCode,
      status: "active",
    });

    // Update sponsor's referral count
    await db
      .update(users)
      .set({
        referralCount: sponsor.referralCount + 1,
      })
      .where(eq(users.id, sponsor.id));

    // Log activities
    await logActivity({
      actorType: "user",
      actorId: walletAddress,
      action: "user.register_with_referral",
      metadata: { sponsorId: sponsor.id, referralCode },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    await logActivity({
      actorType: "user",
      actorId: sponsor.walletAddress,
      action: "user.referred_new_user",
      metadata: { referredUserId: newUser.id },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    return c.json({
      success: true,
      data: {
        userId: newUser.id,
        memberId,
        referralCode: newReferralCode,
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

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get referral relationships
    const referrals = await db
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

    return c.json({
      success: true,
      data: {
        totalReferrals: user.referralCount,
        referrals,
      },
    });
  } catch (error) {
    console.error("Get referrals error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

