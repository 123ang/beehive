// ============================================
// ADMIN ROUTES
// ============================================

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, members, rewards, transactions, users } from "../db";
import { eq, desc, sql, count } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { rewardService } from "../services/RewardService";
import adminAuthRouter from "./admin/auth";
import adminUsersRouter from "./admin/users";
import adminDashboardRouter from "./admin/dashboard";
import adminNewsRouter from "./admin/news";
import adminMerchantsRouter from "./admin/merchants";
import adminNftCollectionsRouter from "./admin/nft-collections";
import adminClassesRouter from "./admin/classes";
import adminAdminsRouter from "./admin/admins";

export const adminRoutes = new Hono();

// Admin auth routes (no auth required)
adminRoutes.route("/auth", adminAuthRouter);

// Admin protected routes
adminRoutes.route("/users", adminUsersRouter);
adminRoutes.route("/dashboard", adminDashboardRouter);
adminRoutes.route("/news", adminNewsRouter);
adminRoutes.route("/merchants", adminMerchantsRouter);
adminRoutes.route("/nft-collections", adminNftCollectionsRouter);
adminRoutes.route("/classes", adminClassesRouter);
adminRoutes.route("/admins", adminAdminsRouter);

// Apply adminAuth middleware to legacy routes that don't have their own middleware
// Note: Individual routers (news, users, etc.) already apply adminAuth middleware
import { adminAuth } from "../middleware/adminAuth";
adminRoutes.use("/stats", adminAuth);
adminRoutes.use("/members", adminAuth);
adminRoutes.use("/rewards", adminAuth);
adminRoutes.use("/transactions", adminAuth);

/**
 * Get platform statistics
 */
adminRoutes.get("/stats", async (c) => {
  // Total members
  const [memberStats] = await db
    .select({ count: count() })
    .from(members);

  // Total users
  const [userStats] = await db
    .select({ count: count() })
    .from(users);

  // Total rewards distributed
  const rewardStats = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
      currency: rewards.currency,
      status: rewards.status,
    })
    .from(rewards)
    .groupBy(rewards.currency, rewards.status);

  // Format reward stats
  const rewardSummary = {
    totalUSDT: "0",
    pendingUSDT: "0",
    claimedUSDT: "0",
    totalBCC: "0",
    pendingBCC: "0",
    claimedBCC: "0",
  };

  for (const stat of rewardStats) {
    const key = `${stat.status === "pending" ? "pending" : stat.status === "claimed" ? "claimed" : "total"}${stat.currency}`;
    if (key in rewardSummary) {
      (rewardSummary as any)[key] = stat.total;
    }
  }

  // Level distribution
  const levelDistribution = await db
    .select({
      level: members.currentLevel,
      count: count(),
    })
    .from(members)
    .groupBy(members.currentLevel)
    .orderBy(members.currentLevel);

  return c.json({
    success: true,
    data: {
      totalMembers: memberStats.count,
      totalUsers: userStats.count,
      rewards: rewardSummary,
      levelDistribution,
    },
  });
});

/**
 * Get all members with pagination
 */
adminRoutes.get("/members", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = (page - 1) * limit;

  const allMembers = await db
    .select()
    .from(members)
    .orderBy(desc(members.joinedAt))
    .limit(limit)
    .offset(offset);

  const [totalCount] = await db
    .select({ count: count() })
    .from(members);

  return c.json({
    success: true,
    data: {
      members: allMembers,
      page,
      limit,
      total: totalCount.count,
      totalPages: Math.ceil(totalCount.count / limit),
    },
  });
});

/**
 * Get member details
 */
adminRoutes.get("/members/:wallet", async (c) => {
  const wallet = c.req.param("wallet").toLowerCase();

  const member = await db.query.members.findFirst({
    where: eq(members.walletAddress, wallet),
  });

  if (!member) {
    return c.json({ success: false, error: "Member not found" }, 404);
  }

  // Get rewards for this member
  const memberRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.recipientWallet, wallet))
    .orderBy(desc(rewards.createdAt))
    .limit(100);

  // Get reward summary
  const rewardSummary = await rewardService.getRewardSummary(wallet);

  return c.json({
    success: true,
    data: {
      member,
      rewards: memberRewards,
      rewardSummary,
    },
  });
});

/**
 * Get pending rewards (for batch processing)
 */
adminRoutes.get("/rewards/pending", async (c) => {
  const pendingRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.status, "pending"))
    .orderBy(desc(rewards.createdAt))
    .limit(500);

  return c.json({
    success: true,
    data: pendingRewards,
  });
});

/**
 * Process expired rewards
 */
adminRoutes.post("/rewards/process-expired", async (c) => {
  const expiredCount = await rewardService.processExpiredRewards();

  return c.json({
    success: true,
    data: {
      processedCount: expiredCount,
    },
  });
});

/**
 * Manually distribute reward
 */
const distributeSchema = z.object({
  recipientWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
  currency: z.enum(["USDT", "BCC"]),
  rewardType: z.enum(["direct_sponsor", "layer_payout", "bcc_token"]),
  notes: z.string().optional(),
});

adminRoutes.post("/rewards/distribute", zValidator("json", distributeSchema), async (c) => {
  const { recipientWallet, amount, currency, rewardType, notes } = c.req.valid("json");

  await db.insert(rewards).values({
    recipientWallet: recipientWallet.toLowerCase(),
    rewardType,
    amount,
    currency,
    status: "instant",
    notes: notes || "Admin distribution",
  });

  return c.json({
    success: true,
    message: "Reward distributed successfully",
  });
});

/**
 * Get recent transactions
 */
adminRoutes.get("/transactions", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = (page - 1) * limit;

  const txs = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    success: true,
    data: txs,
  });
});

