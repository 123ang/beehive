// ============================================
// MEMBERS ROUTES
// ============================================

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, members, rewards } from "../db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { matrixService } from "../services/MatrixService";
import { rewardService } from "../services/RewardService";
import { MEMBERSHIP_LEVELS } from "@beehive/shared";

export const memberRoutes = new Hono();

// Apply auth middleware to all routes
memberRoutes.use("/*", authMiddleware);

/**
 * Get current member's dashboard data
 */
memberRoutes.get("/dashboard", async (c) => {
  const user = c.get("user");

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, user.walletAddress),
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
  const rewardSummary = await rewardService.getRewardSummary(user.walletAddress);

  // Get team size
  const teamSize = await matrixService.getTeamSize(member.id);

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
      directReferrals: member.directSponsorCount,
      teamSize,
      totalInflow: member.totalInflow,
      joinedAt: member.joinedAt,
    },
  });
});

/**
 * Get member's tree structure
 */
memberRoutes.get("/tree", async (c) => {
  const user = c.get("user");
  const depth = parseInt(c.req.query("depth") || "3");

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, user.walletAddress),
  });

  if (!member) {
    return c.json({ success: false, error: "Not a member" }, 404);
  }

  const tree = await matrixService.getTree(member.id, Math.min(depth, 5));

  return c.json({
    success: true,
    data: tree,
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
 * Get reward history
 */
memberRoutes.get("/rewards", async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;

  const allRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.recipientWallet, user.walletAddress))
    .orderBy(desc(rewards.createdAt))
    .limit(limit)
    .offset(offset);

  const summary = await rewardService.getRewardSummary(user.walletAddress);

  return c.json({
    success: true,
    data: {
      rewards: allRewards,
      summary,
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
      directReferralCount: member.directSponsorCount,
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

