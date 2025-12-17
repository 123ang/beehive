// ============================================
// MEMBERS ROUTES
// ============================================

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, members, rewards, placements, transactions, withdrawals } from "../db";
import { eq, desc, sql, asc, and } from "drizzle-orm";
import { authMiddleware, verifyWalletOwnership } from "../middleware/auth";
import { financialRateLimit, standardRateLimit } from "../middleware/rateLimit";
import { matrixService } from "../services/MatrixService";
import { rewardService } from "../services/RewardService";
import { generateMemberId, generateReferralCode } from "../utils/referralCode";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";
import memberNewsRouter from "./members/news";
import memberMerchantsRouter from "./members/merchants";
import memberNftRouter from "./members/nft";
import memberClassesRouter from "./members/classes";

export const memberRoutes = new Hono();

// Public member routes (no auth required)
memberRoutes.route("/news", memberNewsRouter);
memberRoutes.route("/merchants", memberMerchantsRouter);
memberRoutes.route("/nft", memberNftRouter);
memberRoutes.route("/classes", memberClassesRouter);

/**
 * Check if a member exists by wallet address (public, no auth required)
 */
memberRoutes.get("/check/:walletAddress", async (c) => {
  const walletAddress = c.req.param("walletAddress");
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return c.json({ success: false, error: "Invalid wallet address" }, 400);
  }

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, walletAddress.toLowerCase()),
  });

  return c.json({
    success: true,
    data: {
      exists: !!member,
      currentLevel: member?.currentLevel || 0,
    },
  });
});

/**
 * Get member's dashboard data by wallet address (no auth required)
 * This allows users to view their own data after connecting wallet
 */
memberRoutes.get("/dashboard", async (c) => {
  // Get wallet address from query parameter or Authorization header
  const walletAddress = c.req.query("address");
  const authHeader = c.req.header("Authorization");
  
  let address: string | undefined;
  
  if (walletAddress) {
    // Public access via query parameter
    address = walletAddress.toLowerCase();
  } else if (authHeader?.startsWith("Bearer ")) {
    // Authenticated access via JWT token
    const token = authHeader.substring(7);
    const { verifyToken } = await import("../lib/jwt");
    const payload = await verifyToken(token);
    if (payload) {
      address = payload.walletAddress;
    }
  }
  
  if (!address) {
    return c.json({ success: false, error: "Wallet address required" }, 400);
  }

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, address),
  });

  if (!member) {
    return c.json({
      success: true,
      data: {
        isMember: false,
        currentLevel: 0,
        totalEarningsUSDT: "0",
        totalEarningsBCC: "0",
        pendingRewardsUSDT: "0",
        pendingRewardsBCC: "0",
        directReferrals: 0,
        teamSize: 0,
      },
    });
  }

  // Ensure referral code exists and build referral link
  let referralCode = member.referralCode;
  let memberId = member.memberId;

  if (!memberId) {
    memberId = generateMemberId(member.id);
  }

  if (!referralCode) {
    let attempts = 0;
    const maxAttempts = 10;
    do {
      referralCode = generateReferralCode();
      attempts++;
      const existing = await db
        .select()
        .from(members)
        .where(eq(members.referralCode, referralCode))
        .limit(1);
      if (existing.length === 0) break;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
      }
    } while (true);

    await db
      .update(members)
      .set({ referralCode, memberId })
      .where(eq(members.id, member.id));
  }

  const referralLink = `${process.env.FRONTEND_URL || "http://localhost:3001"}/register?referral_code=${referralCode}`;

  // Get sponsor information if exists
  let sponsorWalletAddress: string | null = null;
  if (member.sponsorId) {
    const sponsor = await db.query.members.findFirst({
      where: eq(members.id, member.sponsorId),
    });
    if (sponsor) {
      sponsorWalletAddress = sponsor.walletAddress;
    }
  }

  // Get reward summary
  const rewardSummary = await rewardService.getRewardSummary(address);

  // Get team size
  const teamSize = await matrixService.getTeamSize(member.id);

  // Get actual direct referrals count (members who have this member as sponsor)
  const directReferralsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(members)
    .where(eq(members.sponsorId, member.id));
  const actualDirectReferrals = directReferralsResult[0]?.count || 0;

  return c.json({
    success: true,
    data: {
      isMember: true,
      currentLevel: member.currentLevel,
      levelName: MEMBERSHIP_LEVELS.find((l) => l.level === member.currentLevel)?.name || "None",
      totalEarningsUSDT: (
        parseFloat(rewardSummary.totalDirectSponsor) +
        parseFloat(rewardSummary.totalLayerPayout)
      ).toString(),
      totalEarningsBCC: rewardSummary.totalBCC,
      pendingRewardsUSDT: rewardSummary.pendingUSDT,
      pendingRewardsBCC: rewardSummary.pendingBCC,
      bccBalance: member.bccBalance?.toString() || "0", // Available/transferable BCC balance
      directReferrals: actualDirectReferrals,
      teamSize,
      totalInflow: member.totalInflow,
      joinedAt: member.joinedAt,
      referralCode,
      referralLink,
      sponsor: sponsorWalletAddress ? {
        walletAddress: sponsorWalletAddress,
      } : null,
    },
  });
});

/**
 * Get member's tree structure (shows sponsor and 2 layers below)
 */
memberRoutes.get("/tree", async (c) => {
  const user = c.get("user");
  const depth = parseInt(c.req.query("depth") || "2"); // Default: 2 layers below

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, user.walletAddress),
  });

  if (!member) {
    return c.json({ success: false, error: "Not a member" }, 404);
  }

  // Get sponsor information
  let sponsor = null;
  if (member.sponsorId) {
    sponsor = await db.query.members.findFirst({
      where: eq(members.id, member.sponsorId),
    });
  }

  // Get tree structure (member and descendants)
  const tree = await matrixService.getTree(member.id, Math.min(depth, 5));

  return c.json({
    success: true,
    data: {
      member: {
        id: member.id,
        walletAddress: member.walletAddress,
        username: member.username,
        currentLevel: member.currentLevel,
        joinedAt: member.joinedAt,
      },
      sponsor: sponsor ? {
        id: sponsor.id,
        walletAddress: sponsor.walletAddress,
        username: sponsor.username,
        currentLevel: sponsor.currentLevel,
      } : null,
      tree, // Tree structure showing member and 2 layers below
    },
  });
});

/**
 * Get member's matrix view (sponsor, current member, and 3 direct downlines)
 * Accepts wallet address as query parameter (no auth required)
 */
memberRoutes.get("/matrix", async (c) => {
  const walletAddress = c.req.query("address");
  
  if (!walletAddress) {
    return c.json({ success: false, error: "Wallet address required" }, 400);
  }

  const address = walletAddress.toLowerCase();

  // Get current member
  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, address),
  });

  if (!member) {
    return c.json({ success: false, error: "Member not found" }, 404);
  }

  // Get sponsor (parent in placement)
  let sponsor = null;
  let sponsorPosition = null;
  const [placementRecord] = await db
    .select()
    .from(placements)
    .where(eq(placements.childId, member.id))
    .limit(1);

  if (placementRecord) {
    sponsor = await db.query.members.findFirst({
      where: eq(members.id, placementRecord.parentId),
    });
    sponsorPosition = placementRecord.position;
  }

  // Get direct children (downlines) - positions 1, 2, 3
  const childPlacements = await db
    .select({
      childId: placements.childId,
      position: placements.position,
    })
    .from(placements)
    .where(eq(placements.parentId, member.id))
    .orderBy(asc(placements.position));

  const downlines: Array<{
    position: number;
    member: typeof member | null;
  }> = [];

  // Fill in downlines for positions 1, 2, 3
  for (let pos = 1; pos <= 3; pos++) {
    const childPlacement = childPlacements.find(cp => cp.position === pos);
    if (childPlacement) {
      const childMember = await db.query.members.findFirst({
        where: eq(members.id, childPlacement.childId),
      });
      downlines.push({
        position: pos,
        member: childMember || null,
      });
    } else {
      downlines.push({
        position: pos,
        member: null,
      });
    }
  }

  return c.json({
    success: true,
    data: {
      member: {
        id: member.id,
        walletAddress: member.walletAddress,
        username: member.username,
        currentLevel: member.currentLevel,
        joinedAt: member.joinedAt,
      },
      sponsor: sponsor ? {
        id: sponsor.id,
        walletAddress: sponsor.walletAddress,
        username: sponsor.username,
        currentLevel: sponsor.currentLevel,
        position: sponsorPosition,
      } : null,
      downlines,
    },
  });
});

/**
 * Get layer statistics
 */
memberRoutes.get("/layers", async (c) => {
  const user = c.get("user");

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, user.walletAddress),
  });

  if (!member) {
    return c.json({ success: false, error: "Not a member" }, 404);
  }

  const layerCounts = await matrixService.getLayerCounts(member.id);

  // Build layer statistics
  const layers = [];
  for (let i = 1; i <= 19; i++) {
    const level = MEMBERSHIP_LEVELS.find((l) => l.level === i);
    layers.push({
      layer: i,
      name: level?.name || `Layer ${i}`,
      memberCount: layerCounts[i] || 0,
      rewardAmount: i >= 2 ? level?.priceUSDT || 0 : 0,
      unlocked: (member.currentLevel ?? 0) >= i,
    });
  }

  return c.json({
    success: true,
    data: {
      currentLevel: member.currentLevel,
      layers,
    },
  });
});

/**
 * Get reward history and overview (no auth required - accepts wallet address)
 */
memberRoutes.get("/rewards", async (c) => {
  try {
    const walletAddress = c.req.query("address");
    const authHeader = c.req.header("Authorization");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    
    let address: string | undefined;
    
    if (walletAddress) {
      // Public access via query parameter
      address = walletAddress.toLowerCase();
    } else if (authHeader?.startsWith("Bearer ")) {
      // Authenticated access via JWT token
      const token = authHeader.substring(7);
      const { verifyToken } = await import("../lib/jwt");
      const payload = await verifyToken(token);
      if (payload) {
        address = payload.walletAddress;
      }
    }
    
    if (!address) {
      return c.json({ success: false, error: "Wallet address required" }, 400);
    }

    const allRewards = await db
      .select()
      .from(rewards)
      .where(eq(rewards.recipientWallet, address))
      .orderBy(desc(rewards.createdAt))
      .limit(limit)
      .offset(offset);

    // Get transactions (withdrawals, deposits, etc.)
    const allTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.walletAddress, address))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const summary = await rewardService.getRewardSummary(address);

    // Get member's BCC balance
    const member = await db.query.members.findFirst({
      where: eq(members.walletAddress, address),
    });
    const bccBalance = member?.bccBalance?.toString() || "0";

    // Calculate totals
    const totalEarned = parseFloat(summary.totalDirectSponsor || "0") + parseFloat(summary.totalLayerPayout || "0");
    const totalWithdrawn = parseFloat(summary.claimedUSDT || "0");
    const claimable = parseFloat(summary.pendingUSDT || "0");

    return c.json({
      success: true,
      data: {
        rewards: allRewards,
        transactions: allTransactions, // Include transactions
        summary: {
          ...summary,
          totalEarned: totalEarned.toString(),
          totalWithdrawn: totalWithdrawn.toString(),
          claimable: claimable.toString(),
          bccBalance, // Add BCC balance from members table
        },
        page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error in /rewards endpoint:", error);
    return c.json({ 
      success: false, 
      error: error.message || "Failed to fetch rewards" 
    }, 500);
  }
});

/**
 * Get referral link info
 */
memberRoutes.get("/referral", async (c) => {
  const user = c.get("user");

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, user.walletAddress),
  });

  if (!member) {
    return c.json({ success: false, error: "Not a member" }, 404);
  }

  // Get direct referrals
  const directReferrals = await db
    .select({
      id: members.id,
      walletAddress: members.walletAddress,
      username: members.username,
      currentLevel: members.currentLevel,
      joinedAt: members.joinedAt,
    })
    .from(members)
    .where(eq(members.sponsorId, member.id))
    .orderBy(desc(members.joinedAt))
    .limit(50);

  // Ensure referral code exists; generate if missing
  let referralCode = member.referralCode;
  let memberId = member.memberId;

  if (!memberId) {
    memberId = generateMemberId(member.id);
  }

  if (!referralCode) {
    let attempts = 0;
    const maxAttempts = 10;
    do {
      referralCode = generateReferralCode();
      attempts++;
      const existing = await db
        .select()
        .from(members)
        .where(eq(members.referralCode, referralCode))
        .limit(1);
      if (existing.length === 0) break;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
      }
    } while (true);

    await db
      .update(members)
      .set({ referralCode, memberId })
      .where(eq(members.id, member.id));
  }

  const referralLink = `${process.env.FRONTEND_URL || "http://localhost:3001"}/register?referral_code=${referralCode}`;

  return c.json({
    success: true,
    data: {
      referralCode,
      referralLink,
      directReferralCount: directReferrals.length,
      directReferrals,
    },
  });
});

/**
 * Register new member (after on-chain purchase)
 */
const registerSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  level: z.number().int().min(1).max(19),
  referrerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

memberRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const { txHash, level, referrerAddress, walletAddress } = c.req.valid("json");
  const normalizedAddress = walletAddress.toLowerCase();

  // Check if already a member
  const existing = await db.query.members.findFirst({
    where: eq(members.walletAddress, normalizedAddress),
  });

  // If member exists and purchasing Level 1, upgrade them instead of registering
  if (existing && level === 1) {
    // Redirect to upgrade endpoint logic
    const previousLevel = existing.currentLevel || 0;
    if (previousLevel === 0) {
      // Upgrade from Level 0 to Level 1
      const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
      if (!levelInfo) {
        return c.json({ success: false, error: "Invalid level" }, 400);
      }

      // Verify transaction
      const { verifyUpgradeTransaction } = await import("../utils/transactionVerification");
      const verification = await verifyUpgradeTransaction(
        txHash,
        normalizedAddress,
        levelInfo.priceUSDT
      );

      if (!verification.valid) {
        return c.json({
          success: false,
          error: verification.error || "Transaction verification failed",
        }, 400);
      }

      // Update member's level from 0 to 1
      await db
        .update(members)
        .set({
          currentLevel: 1,
          totalInflow: (parseFloat(existing.totalInflow?.toString() || "0") + levelInfo.priceUSDT).toString(),
        })
        .where(eq(members.id, existing.id));

      // Distribute purchase payment (Level 1: 100 to company, 30 to IT)
      const { distributePurchasePayment } = await import("../utils/paymentDistribution");
      await distributePurchasePayment(
        normalizedAddress,
        1,
        txHash,
        0 // previousLevel = 0
      );

      // Process direct sponsor reward (will be pending until user purchases Level 2)
      const sponsor = await db.query.members.findFirst({
        where: eq(members.id, existing.sponsorId || 0),
      });

      if (sponsor) {
        await rewardService.processDirectSponsorReward(
          sponsor.walletAddress,
          normalizedAddress,
          1 // newMemberLevel = 1
        );
      }

      // Award BCC rewards for Level 1
      const { awardBCCReward } = await import("../utils/bccRewards");
      await awardBCCReward(
        normalizedAddress,
        1,
        undefined,
        `BCC reward for Level 1 membership`
      );

      return c.json({
        success: true,
        data: {
          memberId: existing.id,
          level: 1,
          message: "Upgraded from Level 0 to Level 1",
        },
      });
    }
  }

  if (existing && level > 1) {
    // If member exists and purchasing higher level, use upgrade endpoint
    return c.json({ 
      success: false, 
      error: "Member already exists. Please use the upgrade endpoint instead." 
    }, 400);
  }

  // Get sponsor
  const sponsor = await db.query.members.findFirst({
    where: eq(members.walletAddress, referrerAddress.toLowerCase()),
  });

  if (!sponsor) {
    return c.json({ success: false, error: "Invalid referrer" }, 400);
  }

  // Get level info and verify transaction
  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  if (!levelInfo) {
    return c.json({ success: false, error: "Invalid level" }, 400);
  }

  // Verify transaction on blockchain before processing
  // This verifies ownership - transaction must be from the wallet address
  const { verifyRegistrationTransaction } = await import("../utils/transactionVerification");
  const verification = await verifyRegistrationTransaction(
    txHash,
    normalizedAddress,
    levelInfo.priceUSDT
  );

  if (!verification.valid) {
    return c.json({
      success: false,
      error: verification.error || "Transaction verification failed",
    }, 400);
  }

  // Find placement position
  const placement = await matrixService.findPlacement(sponsor.id);

  if (!placement) {
    return c.json({ success: false, error: "No available placement position" }, 500);
  }

  // Create member
  await db
    .insert(members)
    .values({
      walletAddress: normalizedAddress,
      username: null,
      currentLevel: level,
      totalInflow: levelInfo?.priceUSDT.toString() || "0",
      sponsorId: sponsor.id,
    });

  // Get the inserted member (MySQL doesn't support .returning())
  const [newMember] = await db
    .select()
    .from(members)
    .where(eq(members.walletAddress, normalizedAddress))
    .limit(1);

  if (!newMember) {
    throw new Error("Failed to create member");
  }

  // Place in matrix tree
  await matrixService.placeMember(
    newMember.id,
    placement.parentId,
    placement.position,
    sponsor.id
  );

  // Distribute purchase payment (Level 1: 100 to company, 30 to IT; Upgrades: 100% to company)
  // Note: IT transfer failure doesn't block reward processing
  try {
    const { distributePurchasePayment } = await import("../utils/paymentDistribution");
    await distributePurchasePayment(
      normalizedAddress,
      level,
      txHash,
      0 // previousLevel = 0 for new members
    );
  } catch (error: any) {
    console.error(`❌ Payment distribution error (non-blocking):`, error.message);
    // Continue even if payment distribution fails - reward processing is independent
  }

  // Process direct sponsor reward (will be pending until user purchases Level 2)
  // This is independent of IT transfer and should always run
  try {
    console.log(`\n🎁 ============================================`);
    console.log(`🎁 PROCESSING DIRECT SPONSOR REWARD (INDEPENDENT OF IT TRANSFER)`);
    console.log(`🎁 ============================================`);
    await rewardService.processDirectSponsorReward(
      referrerAddress.toLowerCase(),
      normalizedAddress,
      level // newMemberLevel
    );
    console.log(`✅ Direct sponsor reward processing completed`);
  } catch (error: any) {
    console.error(`❌ Failed to process direct sponsor reward:`, error);
    // Log but don't throw - registration should still succeed
  }

  // Process layer reward if level >= 2
  if (level >= 2) {
    await rewardService.processLayerReward(
      normalizedAddress,
      level,
      levelInfo?.priceUSDT || 0
    );
  }

  // Award BCC rewards for ALL levels from 1 to the purchased level (cumulative)
  // This ensures Level 3 members get 500 (Level 1) + 100 (Level 2) + 200 (Level 3) = 800 BCC total
  const { awardBCCReward } = await import("../utils/bccRewards");
  for (let l = 1; l <= level; l++) {
    await awardBCCReward(
      normalizedAddress,
      l,
      undefined,
      `BCC reward for Level ${l} membership`
    );
  }

  // Log member activity
  const { logMemberActivity } = await import("../utils/memberActivityLogger");
  await logMemberActivity({
    walletAddress: normalizedAddress,
    memberId: newMember.id, // Pass memberId directly
    activityType: "register",
    metadata: {
      level,
      txHash,
      referrerAddress: referrerAddress.toLowerCase(),
      priceUSDT: levelInfo?.priceUSDT || 0,
    },
  });

  return c.json({
    success: true,
    data: {
      memberId: newMember.id,
      level: newMember.currentLevel,
      placement: {
        parentId: placement.parentId,
        position: placement.position,
      },
    },
  });
});

/**
 * Upgrade membership level (for existing members)
 * Requires authentication - user can only upgrade their own membership
 */
const upgradeSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  level: z.number().int().min(1).max(19),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

memberRoutes.post(
  "/upgrade", 
  financialRateLimit,
  zValidator("json", upgradeSchema), 
  async (c) => {
    const { txHash, level, walletAddress } = c.req.valid("json");
    const normalizedWallet = walletAddress.toLowerCase();

    // Ownership is verified via transaction - transaction must be from this wallet

  // Check if member exists
  const existingMember = await db.query.members.findFirst({
    where: eq(members.walletAddress, normalizedWallet),
  });

  if (!existingMember) {
    return c.json({ success: false, error: "Member not found. Please register first." }, 404);
  }

  // Check if level is valid upgrade
  const previousLevel = existingMember.currentLevel || 0;
  if (level <= previousLevel) {
    return c.json({ 
      success: false, 
      error: `Cannot downgrade. Current level: ${previousLevel}, Requested: ${level}` 
    }, 400);
  }

  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  if (!levelInfo) {
    return c.json({ success: false, error: "Invalid level" }, 400);
  }

  // Check if upgrading from Level 1 to Level 2 requires 3 direct sponsors
  if (previousLevel === 1 && level === 2) {
    const directSponsorsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(members)
      .where(eq(members.sponsorId, existingMember.id));
    const directSponsorsCount = directSponsorsResult[0]?.count || 0;

    if (directSponsorsCount < 3) {
      return c.json({
        success: false,
        error: `You need at least 3 direct sponsors to upgrade to Level 2. You currently have ${directSponsorsCount} direct sponsor(s).`,
      }, 400);
    }
  }

  // Verify transaction on blockchain before processing
  const { verifyUpgradeTransaction } = await import("../utils/transactionVerification");
  const verification = await verifyUpgradeTransaction(
    txHash,
    normalizedWallet,
    levelInfo.priceUSDT
  );

  if (!verification.valid) {
    return c.json({
      success: false,
      error: verification.error || "Transaction verification failed",
    }, 400);
  }

  try {
    // Update member's level
    await db
      .update(members)
      .set({
        currentLevel: level,
        totalInflow: (parseFloat(existingMember.totalInflow?.toString() || "0") + levelInfo.priceUSDT).toString(),
      })
      .where(eq(members.id, existingMember.id));

    // Insert transaction record for the purchase (check for duplicates first)
    const existingTx = await db.query.transactions.findFirst({
      where: eq(transactions.txHash, txHash),
    });

    if (!existingTx) {
      await db.insert(transactions).values({
        walletAddress: normalizedWallet,
        txHash: txHash,
        transactionType: "purchase_membership",
        currency: "USDT",
        amount: levelInfo.priceUSDT.toString(),
        status: "confirmed",
        level: level,
        notes: `Upgrade from Level ${previousLevel} to Level ${level}`,
      });
    } else {
      console.log(`⚠️ Transaction ${txHash} already exists in database, skipping insert`);
    }

    // Distribute purchase payment (Level 1: 100 to company, 30 to IT; Upgrades: 100% to company)
    const { distributePurchasePayment } = await import("../utils/paymentDistribution");
    await distributePurchasePayment(
      normalizedWallet,
      level,
      txHash,
      previousLevel // Pass previous level for proper distribution
    );

    // Process layer reward if level >= 2
    if (level >= 2) {
      await rewardService.processLayerReward(
        normalizedWallet,
        level,
        levelInfo.priceUSDT
      );
    }

    // Release pending rewards when upgrading to Level 2
    if (level === 2) {
      const releasedCount = await rewardService.releasePendingRewards(normalizedWallet, level);
      console.log(`Released ${releasedCount} pending rewards for ${normalizedWallet} after upgrading to Level 2`);
    }

    // Award BCC rewards for levels from previousLevel+1 to the new level
    // Previous levels were already rewarded, so we only need to award new levels
    const { awardBCCReward } = await import("../utils/bccRewards");
    
    // Award BCC for all new levels (from previousLevel+1 to the new level)
    for (let l = previousLevel + 1; l <= level; l++) {
      console.log(`Awarding BCC reward for Level ${l} to ${normalizedWallet}`);
      await awardBCCReward(
        normalizedWallet,
        l,
        undefined,
        `BCC reward for Level ${l} membership`
      );
    }

    // Log member activity
    const { logMemberActivity } = await import("../utils/memberActivityLogger");
    await logMemberActivity({
      walletAddress: normalizedWallet,
      memberId: existingMember.id, // Pass memberId directly
      activityType: "purchase_membership",
      metadata: {
        previousLevel,
        newLevel: level,
        txHash,
        priceUSDT: levelInfo.priceUSDT,
      },
    });

    return c.json({
      success: true,
      data: {
        memberId: existingMember.id,
        previousLevel,
        newLevel: level,
        message: `Successfully upgraded from Level ${previousLevel} to Level ${level}`,
      },
    });
  } catch (error: any) {
    console.error("Upgrade error:", error);
    return c.json({ 
      success: false, 
      error: error.message || "Failed to upgrade membership" 
    }, 500);
  }
});

/**
 * Withdraw rewards (USDT or BCC)
 * Transfers tokens from company account to member address
 */
const withdrawSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  currency: z.enum(["USDT", "BCC"]),
  amount: z.number().positive(),
});

memberRoutes.post(
  "/withdraw", 
  standardRateLimit, // Use standard rate limit instead of financial (no auth required)
  zValidator("json", withdrawSchema), 
  async (c) => {
    try {
      const { walletAddress, currency, amount } = c.req.valid("json");
      const normalizedWallet = walletAddress.toLowerCase();

      // Balance check is done in processWithdrawal - no need to verify auth
      // User can only withdraw what they have in their balance
      const { processWithdrawal } = await import("../utils/withdrawals");
    
    const result = await processWithdrawal({
      walletAddress: normalizedWallet,
      currency,
      amount,
      notes: `Withdrawal of ${amount} ${currency} to ${normalizedWallet}`,
    });

    if (!result.success) {
      console.error("Withdrawal failed:", result.error);
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        txHash: result.txHash,
        message: `Successfully withdrew ${amount} ${currency}`,
      },
    });
  } catch (error: any) {
    console.error("Withdrawal endpoint error:", error);
    // Check if it's a validation error
    if (error.issues) {
      console.error("Validation errors:", error.issues);
      return c.json({ 
        success: false, 
        error: `Validation failed: ${error.issues.map((i: any) => `${i.path.join(".")} - ${i.message}`).join(", ")}` 
      }, 400);
    }
    return c.json({ 
      success: false, 
      error: error.message || "Failed to process withdrawal" 
    }, 500);
  }
});

/**
 * Secure withdrawal endpoint (NEW - Queue-based)
 * Client sends only amount - server derives wallet from authenticated user
 * Withdrawal is processed asynchronously via worker
 */
const secureWithdrawSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["USDT", "BCC"]),
});

memberRoutes.post(
  "/withdraw/v2",
  authMiddleware,
  financialRateLimit,
  zValidator("json", secureWithdrawSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { amount, currency } = c.req.valid("json");
      const normalizedWallet = user.walletAddress.toLowerCase();

      // Step 1: Find member
      const member = await db.query.members.findFirst({
        where: eq(members.walletAddress, normalizedWallet),
      });

      if (!member) {
        return c.json({ success: false, error: "Member not found" }, 404);
      }

      // Step 2: Check balance (from database, not client input)
      let currentBalance: number;
      if (currency === "BCC") {
        currentBalance = parseFloat(member.bccBalance?.toString() || "0");
      } else {
        // For USDT, calculate from rewards (pending only)
        const rewardSummary = await rewardService.getRewardSummary(normalizedWallet);
        currentBalance = parseFloat(rewardSummary.pendingUSDT || "0");
      }

      if (currentBalance < amount) {
        return c.json({
          success: false,
          error: `Insufficient ${currency} balance. Available: ${currentBalance}, Requested: ${amount}`,
        }, 400);
      }

      // Step 3: Create withdrawal request in database
      await db
        .insert(withdrawals)
        .values({
          userId: user.userId,
          memberId: member.id,
          walletAddress: normalizedWallet, // Derived from authenticated user
          currency,
          amount: amount.toString(),
          status: "requested",
        });

      // Get the inserted withdrawal ID (MySQL doesn't support .returning())
      const [insertedWithdrawal] = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.walletAddress, normalizedWallet))
        .orderBy(desc(withdrawals.createdAt))
        .limit(1);

      if (!insertedWithdrawal) {
        throw new Error("Failed to create withdrawal request");
      }

      // Step 4: Add to queue for async processing
      const { withdrawalQueue } = await import("../queues/withdrawalQueue");
      await withdrawalQueue.add(
        `withdrawal-${insertedWithdrawal.id}`,
        {
          withdrawalId: insertedWithdrawal.id,
          userId: user.userId,
          memberId: member.id,
          walletAddress: normalizedWallet,
          currency,
          amount,
        },
        {
          jobId: `withdrawal-${insertedWithdrawal.id}`, // Ensure idempotency
        }
      );

      // Step 5: Log activity
      const { logMemberActivity } = await import("../utils/memberActivityLogger");
      await logMemberActivity({
        walletAddress: normalizedWallet,
        memberId: member.id, // Pass memberId directly
        activityType: "withdrawal",
        metadata: { currency, amount, withdrawalId: insertedWithdrawal.id },
      });

      return c.json({
        success: true,
        data: {
          withdrawalId: insertedWithdrawal.id,
          status: "requested",
          message: `Withdrawal request created. Processing ${amount} ${currency}...`,
        },
      });
    } catch (error: any) {
      console.error("Secure withdrawal endpoint error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to create withdrawal request",
      }, 500);
    }
  }
);

/**
 * Get withdrawal status
 */
memberRoutes.get("/withdraw/:withdrawalId", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const withdrawalId = parseInt(c.req.param("withdrawalId"));

    if (isNaN(withdrawalId)) {
      return c.json({ success: false, error: "Invalid withdrawal ID" }, 400);
    }

    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) {
      return c.json({ success: false, error: "Withdrawal not found" }, 404);
    }

    // Verify withdrawal belongs to authenticated user
    if (withdrawal.userId !== user.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    return c.json({
      success: true,
      data: {
        id: withdrawal.id,
        currency: withdrawal.currency,
        amount: withdrawal.amount,
        status: withdrawal.status,
        txHash: withdrawal.onchainTxHash,
        errorMessage: withdrawal.errorMessage,
        createdAt: withdrawal.createdAt,
        processedAt: withdrawal.processedAt,
        completedAt: withdrawal.completedAt,
      },
    });
  } catch (error: any) {
    console.error("Get withdrawal status error:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to get withdrawal status",
    }, 500);
  }
});

