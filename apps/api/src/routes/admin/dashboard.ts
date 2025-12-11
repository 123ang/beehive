import { Hono } from "hono";
import { db } from "../../db";
import { members, users, transactions, rewards, bulkImportBatches } from "../../db/schema";
import { sql, eq, gte, and, desc } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";

const adminDashboardRouter = new Hono();
adminDashboardRouter.use("/*", adminAuth);

// Get dashboard overview
adminDashboardRouter.get("/overview", requirePermission("dashboard.view"), async (c) => {
  const { startDate, endDate } = c.req.query();

  // Calculate start of this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Total users (from members table)
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`count(*)` })
    .from(members);

  // New users this month (from members table)
  const [{ newUsers }] = await db
    .select({ newUsers: sql<number>`count(*)` })
    .from(members)
    .where(gte(members.joinedAt, startOfMonth));

  // Active users this month (members who joined this month)
  // Note: If you want to track activity differently (e.g., members with rewards/transactions),
  // we can update this logic later
  const [{ activeUsers }] = await db
    .select({ activeUsers: sql<number>`count(*)` })
    .from(members)
    .where(gte(members.joinedAt, startOfMonth));

  // Users by membership level (from members table)
  const usersByLevel = await db
    .select({
      level: members.currentLevel,
      count: sql<number>`count(*)`,
    })
    .from(members)
    .groupBy(members.currentLevel);

  // Total earnings (USDT)
  const [{ totalEarnings }] = await db
    .select({
      totalEarnings: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.status, "confirmed"));

  // Earnings this month
  const [{ earningsThisMonth }] = await db
    .select({
      earningsThisMonth: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "confirmed"),
        gte(transactions.createdAt, startOfMonth)
      )
    );

  // Total rewards released (BCC)
  const [{ totalRewards }] = await db
    .select({
      totalRewards: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
    })
    .from(rewards)
    .where(eq(rewards.currency, "BCC"));

  // Rewards this month
  const [{ rewardsThisMonth }] = await db
    .select({
      rewardsThisMonth: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
    })
    .from(rewards)
    .where(
      and(
        eq(rewards.currency, "BCC"),
        gte(rewards.createdAt, startOfMonth)
      )
    );

  // Pending rewards
  const [{ pendingRewards }] = await db
    .select({
      pendingRewards: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
    })
    .from(rewards)
    .where(
      and(
        eq(rewards.currency, "BCC"),
        eq(rewards.status, "pending")
      )
    );

  // Recent bulk imports
  const recentImports = await db
    .select()
    .from(bulkImportBatches)
    .orderBy(desc(bulkImportBatches.createdAt))
    .limit(5);

  return c.json({
    success: true,
    data: {
      userMetrics: {
        totalUsers,
        newUsers,
        activeUsers,
        usersByLevel: usersByLevel.reduce((acc, { level, count }) => ({
          ...acc,
          [level || 0]: count
        }), {}),
      },
      revenueMetrics: {
        totalEarnings: parseFloat(totalEarnings || "0"),
        earningsThisMonth: parseFloat(earningsThisMonth || "0"),
        arpu: totalUsers > 0 ? parseFloat(totalEarnings || "0") / totalUsers : 0,
      },
      rewardsMetrics: {
        totalRewardsReleased: parseFloat(totalRewards || "0"),
        rewardsThisMonth: parseFloat(rewardsThisMonth || "0"),
        pendingRewards: parseFloat(pendingRewards || "0"),
      },
      recentImports,
    },
  });
});

// Get user growth trend
adminDashboardRouter.get("/user-growth", requirePermission("dashboard.view"), async (c) => {
  const { period = "month" } = c.req.query();

  // Get daily user registrations for the last 30 days (from members table)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const growth = await db
    .select({
      date: sql<string>`DATE(joined_at)`,
      count: sql<number>`count(*)`,
    })
    .from(members)
    .where(gte(members.joinedAt, thirtyDaysAgo))
    .groupBy(sql`DATE(joined_at)`)
    .orderBy(sql`DATE(joined_at)`);

  return c.json({ success: true, data: growth });
});

// Get revenue trend
adminDashboardRouter.get("/revenue-trend", requirePermission("dashboard.view"), async (c) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const revenue = await db
    .select({
      date: sql<string>`DATE(created_at)`,
      total: sql<string>`SUM(CAST(amount AS DECIMAL))`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "confirmed"),
        gte(transactions.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  return c.json({ success: true, data: revenue });
});

export default adminDashboardRouter;

