// ============================================
// MEMBERS ROUTES
// ============================================

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, members, rewards, placements, transactions } from "../db";
import { eq, desc, sql, asc, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { matrixService } from "../services/MatrixService";
import { rewardService } from "../services/RewardService";
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
      directReferrals: actualDirectReferrals,
      teamSize,
      totalInflow: member.totalInflow,
      joinedAt: member.joinedAt,
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

  const summary = await rewardService.getRewardSummary(address);

  // Get member's BCC balance
  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, address),
  });
  const bccBalance = member?.bccBalance?.toString() || "0";

  // Calculate totals
  const totalEarned = parseFloat(summary.totalDirectSponsor) + parseFloat(summary.totalLayerPayout);
  const totalWithdrawn = parseFloat(summary.claimedUSDT || "0");
  const claimable = parseFloat(summary.pendingUSDT || "0");

  return c.json({
    success: true,
    data: {
      rewards: allRewards,
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

  return c.json({
    success: true,
    data: {
      referralCode: member.walletAddress,
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
});

memberRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const user = c.get("user");
  const { txHash, level, referrerAddress } = c.req.valid("json");

  // Check if already a member
  const existing = await db.query.members.findFirst({
    where: eq(members.walletAddress, user.walletAddress),
  });

  if (existing) {
    return c.json({ success: false, error: "Already a member" }, 400);
  }

  // Get sponsor
  const sponsor = await db.query.members.findFirst({
    where: eq(members.walletAddress, referrerAddress.toLowerCase()),
  });

  if (!sponsor) {
    return c.json({ success: false, error: "Invalid referrer" }, 400);
  }

  // Find placement position
  const placement = await matrixService.findPlacement(sponsor.id);

  if (!placement) {
    return c.json({ success: false, error: "No available placement position" }, 500);
  }

  // Create member
  const levelInfo = MEMBERSHIP_LEVELS.find((l) => l.level === level);
  const [newMember] = await db
    .insert(members)
    .values({
      walletAddress: user.walletAddress.toLowerCase(),
      username: null,
      currentLevel: level,
      totalInflow: levelInfo?.priceUSDT.toString() || "0",
      sponsorId: sponsor.id,
    })
    .returning();

  // Place in matrix tree
  await matrixService.placeMember(
    newMember.id,
    placement.parentId,
    placement.position,
    sponsor.id
  );

  // Distribute purchase payment (Level 1: 100 to company, 30 to IT; Upgrades: 100% to company)
  const { distributePurchasePayment } = await import("../utils/paymentDistribution");
  await distributePurchasePayment(
    user.walletAddress.toLowerCase(),
    level,
    txHash,
    0 // previousLevel = 0 for new members
  );

  // Process direct sponsor reward
  await rewardService.processDirectSponsorReward(
    referrerAddress.toLowerCase(),
    user.walletAddress.toLowerCase()
  );

  // Process layer reward if level >= 2
  if (level >= 2) {
    await rewardService.processLayerReward(
      user.walletAddress.toLowerCase(),
      level,
      levelInfo?.priceUSDT || 0
    );
  }

  // Award BCC rewards for ALL levels from 1 to the purchased level (cumulative)
  // This ensures Level 3 members get 500 (Level 1) + 100 (Level 2) + 200 (Level 3) = 800 BCC total
  const { awardBCCReward } = await import("../utils/bccRewards");
  for (let l = 1; l <= level; l++) {
    await awardBCCReward(
      user.walletAddress.toLowerCase(),
      l,
      undefined,
      `BCC reward for Level ${l} membership`
    );
  }

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
 * No authentication required - uses walletAddress from request
 */
const upgradeSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  level: z.number().int().min(1).max(19),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

memberRoutes.post("/upgrade", zValidator("json", upgradeSchema), async (c) => {
  const { txHash, level, walletAddress } = c.req.valid("json");
  const normalizedWallet = walletAddress.toLowerCase();

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

  try {
    // Update member's level
    await db
      .update(members)
      .set({
        currentLevel: level,
        totalInflow: (parseFloat(existingMember.totalInflow?.toString() || "0") + levelInfo.priceUSDT).toString(),
      })
      .where(eq(members.id, existingMember.id));

    // Insert transaction record for the purchase
    await db.insert(transactions).values({
      walletAddress: normalizedWallet,
      txHash: txHash,
      transactionType: "purchase",
      currency: "USDT",
      amount: levelInfo.priceUSDT.toString(),
      status: "confirmed",
      level: level,
      notes: `Upgrade from Level ${previousLevel} to Level ${level}`,
    });

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

    // Award BCC rewards for ALL levels from 1 to the new level (cumulative)
    // Only award for levels that haven't been awarded yet
    const { awardBCCReward } = await import("../utils/bccRewards");
    
    // Get all existing BCC rewards for this member (query once, not in loop)
    const existingRewards = await db
      .select()
      .from(rewards)
      .where(
        and(
          eq(rewards.recipientWallet, normalizedWallet),
          eq(rewards.rewardType, "bcc_token"),
          eq(rewards.currency, "BCC")
        )
      );

    // Award BCC for all levels from 1 to the new level
    for (let l = 1; l <= level; l++) {
      // Check if this specific level was already awarded
      const hasLevelReward = existingRewards.some(
        (r) => r.notes && (r.notes.includes(`Level ${l} membership`) || r.notes.includes(`Level ${l}`))
      );

      if (!hasLevelReward) {
        console.log(`Awarding BCC reward for Level ${l} to ${normalizedWallet}`);
        await awardBCCReward(
          normalizedWallet,
          l,
          undefined,
          `BCC reward for Level ${l} membership`
        );
      } else {
        console.log(`BCC reward for Level ${l} already exists for ${normalizedWallet}, skipping`);
      }
    }

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

