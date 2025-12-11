// ============================================
// BEEHIVE DATABASE SCHEMA (Drizzle ORM - MySQL)
// ============================================

import {
  mysqlTable,
  varchar,
  int,
  decimal,
  timestamp,
  datetime,
  boolean,
  text,
  bigint,
  tinyint,
  primaryKey,
  index,
  uniqueIndex,
  autoIncrement,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ============================================
// USERS TABLE
// ============================================
export const users = mysqlTable(
  "users",
  {
    id: int("id").primaryKey().autoincrement(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
    username: varchar("username", { length: 80 }),
    email: varchar("email", { length: 255 }),
    name: varchar("name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    avatarUrl: text("avatar_url"),
    language: varchar("language", { length: 10 }).default("en"),
    nonce: varchar("nonce", { length: 64 }), // For SIWE authentication
    isAdmin: boolean("is_admin").default(false),
    membershipLevel: int("membership_level").default(0),
    status: varchar("status", { length: 20 }).default("active"), // active, suspended, inactive
    totalSpent: decimal("total_spent", { precision: 18, scale: 6 }).default("0"),
    totalRewards: decimal("total_rewards", { precision: 18, scale: 6 }).default("0"),
    referralCode: varchar("referral_code", { length: 50 }).unique(),
    sponsorId: int("sponsor_id"),
    sponsorAddress: varchar("sponsor_address", { length: 42 }),
    memberId: varchar("member_id", { length: 50 }).unique(),
    referralCount: int("referral_count").default(0),
    referralRewardsEarned: decimal("referral_rewards_earned", { precision: 18, scale: 6 }).default("0"),
    isBulkImported: boolean("is_bulk_imported").default(false),
    bulkImportId: int("bulk_import_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    walletIdx: uniqueIndex("users_wallet_idx").on(table.walletAddress),
    referralCodeIdx: uniqueIndex("users_referral_code_idx").on(table.referralCode),
    memberIdIdx: uniqueIndex("users_member_id_idx").on(table.memberId),
    sponsorIdx: index("users_sponsor_idx").on(table.sponsorId),
  })
);

// ============================================
// MEMBERS TABLE
// ============================================
export const members = mysqlTable(
  "members",
  {
    id: int("id").primaryKey().autoincrement(),
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
    id: int("id").primaryKey().autoincrement(),
    recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull(),
    sourceWallet: varchar("source_wallet", { length: 42 }),
    rewardType: varchar("reward_type", { length: 20 }).notNull(), // direct_sponsor, layer_payout, bcc_token
    amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull(), // USDT, BCC
    status: varchar("status", { length: 20 }).notNull(), // instant, pending, claimed, expired
    layerNumber: int("layer_number"),
    pendingExpiresAt: datetime("pending_expires_at", { mode: "date", fsp: 6 }),
    txHash: varchar("tx_hash", { length: 66 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    claimedAt: datetime("claimed_at", { mode: "date", fsp: 6 }),
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
    id: int("id").primaryKey().autoincrement(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
    txHash: varchar("tx_hash", { length: 66 }).unique(),
    level: int("level").notNull(),
    amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, failed
    blockNumber: bigint("block_number", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow(),
    confirmedAt: datetime("confirmed_at", { mode: "date", fsp: 6 }),
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
    id: int("id").primaryKey().autoincrement(),
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
    id: int("id").primaryKey().autoincrement(),
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

// ============================================
// ADMIN SYSTEM TABLES
// ============================================

// Admin Roles Table
export const adminRoles = mysqlTable("admin_roles", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isMasterAdmin: boolean("is_master_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Admin Permissions Table
export const adminPermissions = mysqlTable("admin_permissions", {
  id: int("id").primaryKey().autoincrement(),
  roleId: int("role_id").notNull(),
  permission: varchar("permission", { length: 100 }).notNull(), // e.g., "user.list", "nft.create"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  rolePermissionIdx: uniqueIndex("admin_permissions_role_permission_idx").on(table.roleId, table.permission),
}));

// Admins Table
export const admins = mysqlTable("admins", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  roleId: int("role_id").notNull(),
  active: boolean("active").default(true),
  lastLogin: datetime("last_login", { mode: "date", fsp: 6 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: uniqueIndex("admins_email_idx").on(table.email),
  roleIdx: index("admins_role_idx").on(table.roleId),
}));

// ============================================
// REFERRAL SYSTEM TABLES
// ============================================

// Referral Relationships Table
export const referralRelationships = mysqlTable("referral_relationships", {
  id: int("id").primaryKey().autoincrement(),
  sponsorId: int("sponsor_id").notNull(),
  referredUserId: int("referred_user_id").notNull(),
  referralCodeUsed: varchar("referral_code_used", { length: 50 }).notNull(),
  referralDate: timestamp("referral_date").defaultNow(),
  status: varchar("status", { length: 20 }).default("active"), // active, inactive
}, (table) => ({
  sponsorIdx: index("referral_relationships_sponsor_idx").on(table.sponsorId),
  referredIdx: index("referral_relationships_referred_idx").on(table.referredUserId),
}));

// ============================================
// BULK IMPORT TABLES
// ============================================

// Bulk Import Batches Table
export const bulkImportBatches = mysqlTable("bulk_import_batches", {
  id: int("id").primaryKey().autoincrement(),
  uploadedBy: int("uploaded_by").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: int("file_size").notNull(),
  totalRows: int("total_rows").notNull(),
  successfulImports: int("successful_imports").default(0),
  failedImports: int("failed_imports").default(0),
  duplicateCount: int("duplicate_count").default(0),
  status: varchar("status", { length: 20 }).default("processing"), // processing, completed, failed
  errorLog: text("error_log"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uploadedByIdx: index("bulk_import_batches_uploaded_by_idx").on(table.uploadedBy),
  statusIdx: index("bulk_import_batches_status_idx").on(table.status),
}));

// ============================================
// ADDRESS MODIFICATION TABLES
// ============================================

// Address Modification Requests Table
export const addressModificationRequests = mysqlTable("address_modification_requests", {
  id: int("id").primaryKey().autoincrement(),
  memberId: int("member_id").notNull(),
  currentAddress: varchar("current_address", { length: 42 }).notNull(),
  newAddress: varchar("new_address", { length: 42 }).notNull(),
  requestedBy: int("requested_by").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, cancelled
  approvedBy: int("approved_by"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  approvedAt: datetime("approved_at", { mode: "date", fsp: 6 }),
}, (table) => ({
  memberIdx: index("address_modification_requests_member_idx").on(table.memberId),
  statusIdx: index("address_modification_requests_status_idx").on(table.status),
  requestedByIdx: index("address_modification_requests_requested_by_idx").on(table.requestedBy),
}));

// ============================================
// NEWS MANAGEMENT TABLES
// ============================================

// News Articles Table
export const newsArticles = mysqlTable("news_articles", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("draft"), // draft, published, archived
  createdBy: int("created_by").notNull(),
  publishedAt: datetime("published_at", { mode: "date", fsp: 6 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  slugIdx: uniqueIndex("news_articles_slug_idx").on(table.slug),
  statusIdx: index("news_articles_status_idx").on(table.status),
}));

// News Translations Table
export const newsTranslations = mysqlTable("news_translations", {
  id: int("id").primaryKey().autoincrement(),
  articleId: int("article_id").notNull(),
  language: varchar("language", { length: 10 }).notNull(), // en, cn, jp, ms, etc.
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  articleLanguageIdx: uniqueIndex("news_translations_article_language_idx").on(table.articleId, table.language),
}));

// ============================================
// MERCHANT & DISCOVER TABLES
// ============================================

// Merchants Table
export const merchants = mysqlTable("merchants", {
  id: int("id").primaryKey().autoincrement(),
  merchantName: varchar("merchant_name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  contactInfo: text("contact_info"),
  merchantPageUrl: text("merchant_page_url"),
  active: boolean("active").default(true),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  activeIdx: index("merchants_active_idx").on(table.active),
}));

// Merchant Ads Table
export const merchantAds = mysqlTable("merchant_ads", {
  id: int("id").primaryKey().autoincrement(),
  merchantId: int("merchant_id").notNull(),
  imageUrl: text("image_url").notNull(),
  redirectUrl: text("redirect_url").notNull(),
  active: boolean("active").default(true),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  merchantIdx: index("merchant_ads_merchant_idx").on(table.merchantId),
  activeIdx: index("merchant_ads_active_idx").on(table.active),
}));

// ============================================
// EDUCATION / CLASS MANAGEMENT TABLES
// ============================================

// Classes Table
export const classes = mysqlTable("classes", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  category: varchar("category", { length: 100 }),
  active: boolean("active").default(true),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  activeIdx: index("classes_active_idx").on(table.active),
  categoryIdx: index("classes_category_idx").on(table.category),
}));

// Class Meetings Table
export const classMeetings = mysqlTable("class_meetings", {
  id: int("id").primaryKey().autoincrement(),
  classId: int("class_id").notNull(),
  meetingTitle: varchar("meeting_title", { length: 255 }).notNull(),
  meetingTime: timestamp("meeting_time").notNull(),
  meetingUrl: text("meeting_url").notNull(),
  meetingPassword: varchar("meeting_password", { length: 6 }).notNull(),
  meetingImage: text("meeting_image"),
  speaker: varchar("speaker", { length: 255 }),
  description: text("description"),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  classIdx: index("class_meetings_class_idx").on(table.classId),
  meetingTimeIdx: index("class_meetings_meeting_time_idx").on(table.meetingTime),
}));

// ============================================
// PURCHASE FIELD CONFIGURATION TABLE
// ============================================

// Purchase Field Config Table
export const purchaseFieldConfig = mysqlTable("purchase_field_config", {
  id: int("id").primaryKey().autoincrement(),
  fieldKey: varchar("field_key", { length: 100 }).notNull().unique(),
  fieldLabel: varchar("field_label", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).notNull(), // text, email, phone, select, etc.
  required: boolean("required").default(false),
  active: boolean("active").default(true),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  fieldKeyIdx: uniqueIndex("purchase_field_config_field_key_idx").on(table.fieldKey),
  activeIdx: index("purchase_field_config_active_idx").on(table.active),
}));

// ============================================
// ACTIVITY LOG TABLE
// ============================================

// Activity Logs Table
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").primaryKey().autoincrement(),
  actorType: varchar("actor_type", { length: 20 }).notNull(), // user, admin
  actorId: varchar("actor_id", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  metadata: text("metadata"), // JSON string
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  actorIdx: index("activity_logs_actor_idx").on(table.actorType, table.actorId),
  actionIdx: index("activity_logs_action_idx").on(table.action),
  createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
}));

// ============================================
// DASHBOARD METRICS TABLE (Pre-aggregated)
// ============================================

// Dashboard Metrics Table
export const dashboardMetrics = mysqlTable("dashboard_metrics", {
  id: int("id").primaryKey().autoincrement(),
  metricDate: timestamp("metric_date").notNull(),
  metricType: varchar("metric_type", { length: 50 }).notNull(), // revenue, users, rewards, etc.
  metricValue: decimal("metric_value", { precision: 18, scale: 6 }).notNull(),
  metadata: text("metadata"), // JSON string for additional context
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dateTypeIdx: uniqueIndex("dashboard_metrics_date_type_idx").on(table.metricDate, table.metricType),
  metricTypeIdx: index("dashboard_metrics_metric_type_idx").on(table.metricType),
}));

// ============================================
// NFT COLLECTIONS TABLE (Admin-managed)
// ============================================

// NFT Collections Table
export const nftCollections = mysqlTable("nft_collections", {
  id: int("id").primaryKey().autoincrement(),
  shortName: varchar("short_name", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  bccReward: decimal("bcc_reward", { precision: 18, scale: 6 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  active: boolean("active").default(true),
  maxSupply: int("max_supply").notNull(),
  minted: int("minted").default(0),
  contractCollectionId: int("contract_collection_id"), // ID from smart contract
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  shortNameIdx: uniqueIndex("nft_collections_short_name_idx").on(table.shortName),
  activeIdx: index("nft_collections_active_idx").on(table.active),
}));

// ============================================
// NEWSLETTER SUBSCRIPTIONS TABLE
// ============================================

// Newsletter Subscriptions Table
export const newsletterSubscriptions = mysqlTable("newsletter_subscriptions", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("active"), // active, unsubscribed
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: datetime("unsubscribed_at", { mode: "date", fsp: 6 }),
}, (table) => ({
  emailIdx: uniqueIndex("newsletter_subscriptions_email_idx").on(table.email),
  statusIdx: index("newsletter_subscriptions_status_idx").on(table.status),
}));

// Export type inference helpers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Reward = typeof rewards.$inferSelect;
export type NewReward = typeof rewards.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type AdminRole = typeof adminRoles.$inferSelect;
export type NewAdminRole = typeof adminRoles.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type AdminPermission = typeof adminPermissions.$inferSelect;
export type NewAdminPermission = typeof adminPermissions.$inferInsert;
export type ReferralRelationship = typeof referralRelationships.$inferSelect;
export type NewReferralRelationship = typeof referralRelationships.$inferInsert;
export type BulkImportBatch = typeof bulkImportBatches.$inferSelect;
export type NewBulkImportBatch = typeof bulkImportBatches.$inferInsert;
export type AddressModificationRequest = typeof addressModificationRequests.$inferSelect;
export type NewAddressModificationRequest = typeof addressModificationRequests.$inferInsert;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type NewNewsArticle = typeof newsArticles.$inferInsert;
export type NewsTranslation = typeof newsTranslations.$inferSelect;
export type NewNewsTranslation = typeof newsTranslations.$inferInsert;
export type Merchant = typeof merchants.$inferSelect;
export type NewMerchant = typeof merchants.$inferInsert;
export type MerchantAd = typeof merchantAds.$inferSelect;
export type NewMerchantAd = typeof merchantAds.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type ClassMeeting = typeof classMeetings.$inferSelect;
export type NewClassMeeting = typeof classMeetings.$inferInsert;
export type PurchaseFieldConfig = typeof purchaseFieldConfig.$inferSelect;
export type NewPurchaseFieldConfig = typeof purchaseFieldConfig.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type DashboardMetric = typeof dashboardMetrics.$inferSelect;
export type NewDashboardMetric = typeof dashboardMetrics.$inferInsert;
export type NftCollection = typeof nftCollections.$inferSelect;
export type NewNftCollection = typeof nftCollections.$inferInsert;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type NewNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;
