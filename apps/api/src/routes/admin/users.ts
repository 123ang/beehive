import { Hono } from "hono";
import { db } from "../../db";
import { users, members, bulkImportBatches, referralRelationships } from "../../db/schema";
import { eq, desc, like, or, sql, and, count } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";
import { parseFile, isValidWalletAddress } from "../../utils/csvParser";
import { generateMemberId, generateReferralCode } from "../../utils/referralCode";

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

    // Apply search filter
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(members.walletAddress, `%${search}%`),
          like(members.username, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const membersList = await query
      .orderBy(desc(members.joinedAt))
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
 * Update member details
 * PUT /api/admin/users/members/:id
 */
adminUsersRouter.put("/members/:id", requirePermission("user.modify_address"), async (c) => {
  try {
    const admin = c.get("admin");
    const memberId = parseInt(c.req.param("id"));
    const { walletAddress, username } = await c.req.json();

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
    if (username !== undefined) {
      updateData.username = username || null;
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

    // Process each row
    for (const row of rows) {
      const walletAddress = row.wallet_address?.trim();

      // Validate wallet address
      if (!isValidWalletAddress(walletAddress)) {
        results.failed.push({
          address: walletAddress,
          reason: "Invalid wallet address format",
        });
        continue;
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (existingUser) {
        results.duplicates.push({ address: walletAddress });
        continue;
      }

      // Create user as Level 1 member
      try {
        const [newUser] = await db
          .insert(users)
          .values({
            walletAddress: walletAddress.toLowerCase(),
            email: row.email || null,
            name: row.name || null,
            phone: row.phone || null,
            membershipLevel: 1,
            status: "active",
            isBulkImported: true,
            bulkImportId: importBatch.id,
          })
          .$returningId();

        // Generate member ID and referral code
        const memberId = generateMemberId(newUser.id);
        const referralCode = generateReferralCode(memberId);

        await db
          .update(users)
          .set({ memberId, referralCode })
          .where(eq(users.id, newUser.id));

        results.successful.push({
          address: walletAddress,
          userId: newUser.id,
          memberId,
          referralCode,
        });

        // Log activity
        await logActivity({
          actorType: "admin",
          actorId: admin.adminId.toString(),
          action: "admin.bulk_import_user",
          metadata: {
            userId: newUser.id,
            walletAddress,
            importId: importBatch.id,
          },
          ipAddress: getClientIp(c.req.raw.headers),
          userAgent: getUserAgent(c.req.raw.headers),
        });
      } catch (error) {
        results.failed.push({
          address: walletAddress,
          reason: error.message,
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

