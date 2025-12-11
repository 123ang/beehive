import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { db } from "../../db";
import { admins, adminRoles, adminPermissions } from "../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";

const adminAuthRouter = new Hono();

/**
 * Admin Login
 * POST /api/admin/auth/login
 */
adminAuthRouter.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Find admin by email
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email.toLowerCase()))
      .limit(1);

    if (!admin) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    if (!admin.active) {
      return c.json({ error: "Account is inactive" }, 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

    if (!isValidPassword) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Fetch role
    const [role] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.id, admin.roleId))
      .limit(1);

    if (!role) {
      return c.json({ error: "Role not found" }, 401);
    }

    // Fetch permissions
    const permissions = await db
      .select()
      .from(adminPermissions)
      .where(eq(adminPermissions.roleId, admin.roleId));

    // Generate JWT token
    const token = await sign(
      {
        adminId: admin.id,
        email: admin.email,
        roleId: admin.roleId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      },
      process.env.JWT_SECRET || "secret"
    );

    // Update last login
    await db
      .update(admins)
      .set({ lastLogin: new Date() })
      .where(eq(admins.id, admin.id));

    // Log activity
    await logActivity({
      actorType: "admin",
      actorId: admin.id.toString(),
      action: "admin.login",
      metadata: { email: admin.email },
      ipAddress: getClientIp(c.req.raw.headers),
      userAgent: getUserAgent(c.req.raw.headers),
    });

    return c.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          roleId: admin.roleId,
          roleName: role.name,
          isMasterAdmin: role.isMasterAdmin,
          permissions: permissions.map((p) => p.permission),
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get Current Admin Profile
 * GET /api/admin/auth/me
 */
adminAuthRouter.get("/me", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = await verify(token, process.env.JWT_SECRET || "secret");

      if (!payload.adminId) {
        return c.json({ error: "Invalid token" }, 401);
      }

    // Fetch admin details
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, payload.adminId as number))
      .limit(1);

    if (!admin || !admin.active) {
      return c.json({ error: "Admin not found or inactive" }, 401);
    }

    // Fetch role
    const [role] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.id, admin.roleId))
      .limit(1);

    // Fetch permissions
    const permissions = await db
      .select()
      .from(adminPermissions)
      .where(eq(adminPermissions.roleId, admin.roleId));

    return c.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        roleId: admin.roleId,
        roleName: role?.name,
        isMasterAdmin: role?.isMasterAdmin || false,
        permissions: permissions.map((p) => p.permission),
        lastLogin: admin.lastLogin,
      },
    });
    } catch (verifyError) {
      console.error("Token verification error:", verifyError);
      return c.json({ error: "Invalid or expired token" }, 401);
    }
  } catch (error) {
    console.error("Get admin profile error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default adminAuthRouter;

