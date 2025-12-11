import { Hono } from "hono";
import { db } from "../../db";
import { users, members, bulkImportBatches, referralRelationships, placements, memberClosure } from "../../db/schema";
import { eq, desc, asc, like, or, sql, and, count } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";
import { parseFile, isValidWalletAddress } from "../../utils/csvParser";
import { generateMemberId, generateReferralCode } from "../../utils/referralCode";
import { createMemberWithPlacement } from "../../utils/memberPlacement";

const adminUsersRouter = new Hono();

// Apply admin auth to all routes
adminUsersRouter.use("/*", adminAuth);

/**
 * Get all members with pagination
 * GET /api/admin/users/members
 */
adminUsersRouter.get("/members", requirePermission("user.list"), async (c) => {
  try {
    const { page = "1", limit = "20", search = "" } = c.req.query();
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = db.select().from(members);

    // Apply search filter (only by wallet address, case-insensitive)
    const conditions = [];
    if (search) {
      const searchLower = search.toLowerCase();
      conditions.push(
        sql`LOWER(${members.walletAddress}) LIKE ${`%${searchLower}%`}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const membersList = await query
      .orderBy(asc(members.id))
      .limit(limitNum)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      success: true,
      data: {
        members: membersList,
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Get members error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get member details by member ID
 * GET /api/admin/users/members/:id
 */
adminUsersRouter.get("/members/:id", requirePermission("user.view"), async (c) => {
  try {
    const memberId = parseInt(c.req.param("id"));
    
    if (isNaN(memberId)) {
      return c.json({ error: "Invalid member ID" }, 400);
    }

    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (!member) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Try to get corresponding user if exists
    let user = null;
    if (member.walletAddress) {
      const [userData] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, member.walletAddress.toLowerCase()))
        .limit(1);
      user = userData || null;
    }

    return c.json({
      success: true,
      data: {
        member,
        user,
      },
    });
  } catch (error) {
    console.error("Get member details error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get member's matrix info (sponsor and direct children)
 * GET /api/admin/users/members/:id/matrix
 */
adminUsersRouter.get("/members/:id/matrix", requirePermission("user.view"), async (c) => {
  try {
    const memberId = parseInt(c.req.param("id"));
    
    if (isNaN(memberId)) {
      return c.json({ error: "Invalid member ID" }, 400);
    }

    // Get member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (!member) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Get sponsor (parent in placement)
    let sponsor = null;
    let sponsorPosition = null;
    const [placementRecord] = await db
      .select()
      .from(placements)
      .where(eq(placements.childId, memberId))
      .limit(1);

    if (placementRecord) {
      const [sponsorMember] = await db
        .select()
        .from(members)
        .where(eq(members.id, placementRecord.parentId))
        .limit(1);
      sponsor = sponsorMember || null;
      sponsorPosition = placementRecord.position;
    }

    // Get direct children (downlines)
    const childPlacements = await db
      .select({
        childId: placements.childId,
        position: placements.position,
      })
      .from(placements)
      .where(eq(placements.parentId, memberId))
      .orderBy(asc(placements.position));

    const children: Array<{
      position: number;
      member: typeof member | null;
    }> = [];

    // Fill in children for positions 1, 2, 3
    for (let pos = 1; pos <= 3; pos++) {
      const childPlacement = childPlacements.find(cp => cp.position === pos);
      if (childPlacement) {
        const [childMember] = await db
          .select()
          .from(members)
          .where(eq(members.id, childPlacement.childId))
          .limit(1);
        children.push({
          position: pos,
          member: childMember || null,
        });
      } else {
        children.push({
          position: pos,
          member: null,
        });
      }
    }

    // Check if this member is a root (has no parent placement)
    const isRoot = !placementRecord;

    return c.json({
      success: true,
      data: {
        member,
        isRoot,
        sponsor,
        sponsorPosition,
        children,
      },
    });
  } catch (error) {
    console.error("Get member matrix error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Update member details
 * PUT /api/admin/users/members/:id
 */
adminUsersRouter.put("/members/:id", requirePermission("user.modify_address"), async (c) => {
  try {
    const admin = c.get("admin");
    const memberId = parseInt(c.req.param("id"));
    const { walletAddress } = await c.req.json();

    if (isNaN(memberId)) {
      return c.json({ error: "Invalid member ID" }, 400);
    }

    // Check if member exists
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (!member) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Update member
    const updateData: any = {};
    if (walletAddress !== undefined) {
      updateData.walletAddress = walletAddress.toLowerCase();
    }

    await db.update(members).set(updateData).where(eq(members.id, memberId));

    // Also update user table if exists
    if (walletAddress && member.walletAddress) {
      await db
        .update(users)
        .set({ walletAddress: walletAddress.toLowerCase() })
        .where(eq(users.walletAddress, member.walletAddress.toLowerCase()));
    }

    // Log activity
    await logActivity({
      actorType: "admin",
      actorId: admin.adminId.toString(),
      action: "admin.update_member",
      metadata: {
        memberId,
        changes: { walletAddress, username },
      },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Update member error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get Users List
 * GET /api/admin/users
 */
adminUsersRouter.get("/", requirePermission("user.list"), async (c) => {
  try {
    const { page = "1", limit = "20", search = "", status = "" } = c.req.query();
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = db.select().from(users);

    // Apply filters
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(users.walletAddress, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`),
          like(users.memberId, `%${search}%`)
        )
      );
    }
    if (status) {
      conditions.push(eq(users.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const usersList = await query
      .orderBy(desc(users.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      success: true,
      data: {
        users: usersList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get User Details
 * GET /api/admin/users/:id
 */
adminUsersRouter.get("/:id", requirePermission("user.view"), async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    
    if (isNaN(userId)) {
      return c.json({ error: "Invalid user ID" }, 400);
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get referral relationships
    const referrals = await db
      .select()
      .from(referralRelationships)
      .where(eq(referralRelationships.sponsorId, userId));

    return c.json({
      success: true,
      data: {
        user,
        referrals: referrals.length,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Bulk Import Users from CSV/Excel
 * POST /api/admin/users/bulk-import
 */
adminUsersRouter.post("/bulk-import", requirePermission("user.bulk_import"), async (c) => {
  try {
    const admin = c.get("admin");
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Read file
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse file
    let rows;
    try {
      rows = parseFile(buffer, file.name);
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }

    // Create import batch record
    const [importBatch] = await db
      .insert(bulkImportBatches)
      .values({
        uploadedBy: admin.adminId,
        fileName: file.name,
        fileSize: file.size,
        totalRows: rows.length,
        status: "processing",
      })
      .$returningId();

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      duplicates: [] as any[],
    };

    // Process each row - create members with matrix placement
    for (const row of rows) {
      const walletAddress = row.wallet_address?.trim();
      const referrerWallet = row.referrer_wallet?.trim();

      // Validate wallet address
      if (!isValidWalletAddress(walletAddress)) {
        results.failed.push({
          address: walletAddress,
          reason: "Invalid wallet address format",
        });
        continue;
      }

      // Validate referrer wallet if provided
      if (referrerWallet && !isValidWalletAddress(referrerWallet)) {
        results.failed.push({
          address: walletAddress,
          reason: "Invalid referrer wallet address format",
        });
        continue;
      }

      // Check if member already exists
      const [existingMember] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (existingMember) {
        results.duplicates.push({ address: walletAddress });
        continue;
      }

      // Create member with matrix placement
      try {
        // Handle referrer - if not provided or not found, find root member
        let actualReferrerWallet = referrerWallet;
        
        if (!actualReferrerWallet) {
          // Find the first member (root) to use as default referrer
          const [rootMember] = await db
            .select()
            .from(members)
            .orderBy(members.joinedAt)
            .limit(1);
          
          if (rootMember) {
            actualReferrerWallet = rootMember.walletAddress;
          } else {
            // No members exist yet - this will be the first member (root)
            // We'll create it without a sponsor
            throw new Error("No root member found. Please import a root member first or provide a referrer_wallet.");
          }
        }

        // Verify referrer exists
        const [referrerMember] = await db
          .select()
          .from(members)
          .where(eq(members.walletAddress, actualReferrerWallet.toLowerCase()))
          .limit(1);

        if (!referrerMember) {
          results.failed.push({
            address: walletAddress,
            reason: `Referrer not found: ${actualReferrerWallet}`,
          });
          continue;
        }

        // Create member and place in 3x3 matrix
        const { memberId, placement } = await createMemberWithPlacement(
          walletAddress,
          1, // Level 1
          actualReferrerWallet, // Use referrer from CSV or root member
          row.username || undefined
        );

        // Also create/update user record for consistency
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.walletAddress, walletAddress.toLowerCase()))
          .limit(1);

        if (existingUser) {
          // Update existing user
          const userMemberId = generateMemberId(existingUser.id);
          const referralCode = generateReferralCode(userMemberId);
          await db
            .update(users)
            .set({
              memberId: userMemberId,
              referralCode,
              membershipLevel: 1,
              isBulkImported: true,
              bulkImportId: importBatch.id,
            })
            .where(eq(users.id, existingUser.id));
        } else {
          // Create new user record
          const userMemberId = generateMemberId(memberId);
          const referralCode = generateReferralCode(userMemberId);
          await db
            .insert(users)
            .values({
              walletAddress: walletAddress.toLowerCase(),
              email: row.email || null,
              name: row.name || null,
              phone: row.phone || null,
              membershipLevel: 1,
              status: "active",
              memberId: userMemberId,
              referralCode,
              isBulkImported: true,
              bulkImportId: importBatch.id,
            });
        }

        results.successful.push({
          address: walletAddress,
          memberId,
          referrerWallet: referrerWallet || null,
          placement: placement ? {
            parentId: placement.parentId,
            position: placement.position,
          } : null,
        });

        // Log activity
        await logActivity({
          actorType: "admin",
          actorId: admin.adminId.toString(),
          action: "admin.bulk_import_user",
          metadata: {
            memberId,
            walletAddress,
            referrerWallet: referrerWallet || null,
            placement: placement ? {
              parentId: placement.parentId,
              position: placement.position,
            } : null,
            importId: importBatch.id,
          },
          ipAddress: getClientIp(c.req.raw.headers),
          userAgent: getUserAgent(c.req.raw.headers),
        });
      } catch (error: any) {
        results.failed.push({
          address: walletAddress,
          reason: error.message || "Failed to create member",
        });
      }
    }

    // Update import batch record
    await db
      .update(bulkImportBatches)
      .set({
        successfulImports: results.successful.length,
        failedImports: results.failed.length,
        duplicateCount: results.duplicates.length,
        status: "completed",
        errorLog: JSON.stringify(results.failed),
      })
      .where(eq(bulkImportBatches.id, importBatch.id));

    // Log completion
    await logActivity({
      actorType: "admin",
      actorId: admin.adminId.toString(),
      action: "admin.bulk_import_complete",
      metadata: {
        importId: importBatch.id,
        total: rows.length,
        successful: results.successful.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length,
      },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    return c.json({
      success: true,
      data: {
        importId: importBatch.id,
        results: {
          total: rows.length,
          successful: results.successful.length,
          failed: results.failed.length,
          duplicates: results.duplicates.length,
          details: results,
        },
      },
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get Import History
 * GET /api/admin/users/import-history
 */
adminUsersRouter.get("/import-history", requirePermission("user.bulk_import"), async (c) => {
  try {
    const imports = await db
      .select()
      .from(bulkImportBatches)
      .orderBy(desc(bulkImportBatches.createdAt))
      .limit(50);

    return c.json({
      success: true,
      data: imports,
    });
  } catch (error) {
    console.error("Get import history error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default adminUsersRouter;

