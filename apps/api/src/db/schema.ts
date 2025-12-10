// ============================================
// BEEHIVE DATABASE SCHEMA (Drizzle ORM - MySQL)
// ============================================

import {
  mysqlTable,
  serial,
  varchar,
  int,
  decimal,
  timestamp,
  boolean,
  text,
  bigint,
  tinyint,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ============================================
// USERS TABLE
// ============================================
export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
    username: varchar("username", { length: 80 }),
    email: varchar("email", { length: 255 }),
    avatarUrl: text("avatar_url"),
    language: varchar("language", { length: 10 }).default("en"),
    nonce: varchar("nonce", { length: 64 }), // For SIWE authentication
    isAdmin: boolean("is_admin").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    walletIdx: uniqueIndex("users_wallet_idx").on(table.walletAddress),
  })
);

// ============================================
// MEMBERS TABLE
// ============================================
export const members = mysqlTable(
  "members",
  {
    id: serial("id").primaryKey(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
    username: varchar("username", { length: 80 }),
    rootId: int("root_id"),
    sponsorId: int("sponsor_id"),
    currentLevel: int("current_level").default(0),
    totalInflow: decimal("total_inflow", { precision: 18, scale: 6 }).default("0"),
    totalOutflowUsdt: decimal("total_outflow_usdt", { precision: 18, scale: 6 }).default("0"),
    totalOutflowBcc: int("total_outflow_bcc").default(0),
    directSponsorCount: int("direct_sponsor_count").default(0),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => ({
    walletIdx: uniqueIndex("members_wallet_idx").on(table.walletAddress),
    sponsorIdx: index("members_sponsor_idx").on(table.sponsorId),
    levelIdx: index("members_level_idx").on(table.currentLevel),
  })
);

// Members relations
export const membersRelations = relations(members, ({ one, many }) => ({
  sponsor: one(members, {
    fields: [members.sponsorId],
    references: [members.id],
    relationName: "sponsor",
  }),
  root: one(members, {
    fields: [members.rootId],
    references: [members.id],
    relationName: "root",
  }),
  directReferrals: many(members, { relationName: "sponsor" }),
}));

// ============================================
// PLACEMENTS TABLE (Matrix Tree Structure)
// ============================================
export const placements = mysqlTable(
  "placements",
  {
    parentId: bigint("parent_id", { mode: "number" }).notNull(),
    childId: bigint("child_id", { mode: "number" }).primaryKey(),
    position: tinyint("position").notNull(), // 1, 2, or 3
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    parentIdx: index("placements_parent_idx").on(table.parentId),
    parentPosIdx: index("placements_parent_pos_idx").on(table.parentId, table.position),
  })
);

// ============================================
// MEMBER CLOSURE TABLE (For efficient tree queries)
// ============================================
export const memberClosure = mysqlTable(
  "member_closure",
  {
    ancestorId: bigint("ancestor_id", { mode: "number" }).notNull(),
    descendantId: bigint("descendant_id", { mode: "number" }).notNull(),
    depth: int("depth").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ancestorId, table.descendantId] }),
    descendantIdx: index("closure_descendant_idx").on(table.descendantId),
    depthIdx: index("closure_depth_idx").on(table.ancestorId, table.depth),
  })
);

// ============================================
// REWARDS TABLE
// ============================================
export const rewards = mysqlTable(
  "rewards",
  {
    id: serial("id").primaryKey(),
    recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull(),
    sourceWallet: varchar("source_wallet", { length: 42 }),
    rewardType: varchar("reward_type", { length: 20 }).notNull(), // direct_sponsor, layer_payout, bcc_token
    amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull(), // USDT, BCC
    status: varchar("status", { length: 20 }).notNull(), // instant, pending, claimed, expired
    layerNumber: int("layer_number"),
    pendingExpiresAt: timestamp("pending_expires_at"),
    txHash: varchar("tx_hash", { length: 66 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    claimedAt: timestamp("claimed_at"),
  },
  (table) => ({
    recipientIdx: index("rewards_recipient_idx").on(table.recipientWallet),
    statusIdx: index("rewards_status_idx").on(table.status),
    typeIdx: index("rewards_type_idx").on(table.rewardType),
  })
);

// ============================================
// TRANSACTIONS TABLE
// ============================================
export const transactions = mysqlTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
    txHash: varchar("tx_hash", { length: 66 }).unique(),
    level: int("level").notNull(),
    amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, failed
    blockNumber: bigint("block_number", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow(),
    confirmedAt: timestamp("confirmed_at"),
  },
  (table) => ({
    walletIdx: index("transactions_wallet_idx").on(table.walletAddress),
    txHashIdx: uniqueIndex("transactions_tx_hash_idx").on(table.txHash),
    statusIdx: index("transactions_status_idx").on(table.status),
  })
);

// ============================================
// LEVELS TABLE
// ============================================
export const levels = mysqlTable("levels", {
  level: int("level").primaryKey(),
  nameEn: varchar("name_en", { length: 50 }).notNull(),
  nameCn: varchar("name_cn", { length: 50 }).notNull(),
  priceUsdt: decimal("price_usdt", { precision: 18, scale: 6 }).notNull(),
  bccReward: int("bcc_reward").notNull(),
  active: boolean("active").default(true),
});

// ============================================
// LAYER COUNTERS TABLE
// ============================================
export const layerCounters = mysqlTable(
  "layer_counters",
  {
    id: serial("id").primaryKey(),
    uplineMemberId: int("upline_member_id").notNull(),
    layerNumber: int("layer_number").notNull(),
    upgradeCount: int("upgrade_count").default(0),
  },
  (table) => ({
    uplineLayerIdx: uniqueIndex("layer_counters_upline_layer_idx").on(
      table.uplineMemberId,
      table.layerNumber
    ),
  })
);

// ============================================
// SESSIONS TABLE (for JWT token invalidation)
// ============================================
export const sessions = mysqlTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: int("user_id").notNull(),
    token: varchar("token", { length: 500 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
    tokenIdx: index("sessions_token_idx").on(table.token),
  })
);

// Export type inference helpers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Reward = typeof rewards.$inferSelect;
export type NewReward = typeof rewards.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
