import { Context, Next } from "hono";
import { verify } from "hono/jwt";
import { jwtVerify } from "jose";
import { db } from "../db";
import { admins, adminPermissions, adminRoles } from "../db/schema";
import { eq } from "drizzle-orm";

export interface AdminContext {
  adminId: number;
  email: string;
  roleId: number;
  permissions: string[];
  isMasterAdmin: boolean;
}

// Extend Hono context to include admin
declare module "hono" {
  interface ContextVariableMap {
    admin: AdminContext;
  }
}

/**
 * Middleware to verify admin JWT token
 */
export const adminAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    // Use the same JWT_SECRET as in auth.ts
    const jwtSecret = new TextEncoder().encode(
      process.env.JWT_SECRET || "beehive-super-secret-jwt-key-change-in-production"
    );
    
    // Try to verify with jose first (for tokens with issuer/audience)
    let payload: any;
    try {
      const { payload: josePayload } = await jwtVerify(token, jwtSecret, {
        issuer: "beehive-api",
        audience: "beehive-app",
      });
      payload = josePayload;
    } catch (joseError) {
      // Fallback to hono/jwt verification for backward compatibility
      const jwtSecretString = process.env.JWT_SECRET || "beehive-super-secret-jwt-key-change-in-production";
      payload = await verify(token, jwtSecretString);
    }

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

    // Fetch role and permissions
    const [role] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.id, admin.roleId))
      .limit(1);

    if (!role) {
      return c.json({ error: "Role not found" }, 401);
    }

    const permissions = await db
      .select()
      .from(adminPermissions)
      .where(eq(adminPermissions.roleId, admin.roleId));

    // Set admin context
    c.set("admin", {
      adminId: admin.id,
      email: admin.email,
      roleId: admin.roleId,
      permissions: permissions.map((p) => p.permission),
      isMasterAdmin: role.isMasterAdmin,
    });

    await next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};

/**
 * Middleware to check if admin has specific permission
 */
export const requirePermission = (permission: string) => {
  return async (c: Context, next: Next) => {
    const admin = c.get("admin");

    if (!admin) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Master admin has all permissions
    if (admin.isMasterAdmin) {
      await next();
      return;
    }

    // Check if admin has the required permission
    if (!admin.permissions.includes(permission)) {
      return c.json({ error: "Forbidden: Insufficient permissions" }, 403);
    }

    await next();
  };
};

/**
 * Middleware to require master admin role
 */
export const requireMasterAdmin = async (c: Context, next: Next) => {
  const admin = c.get("admin");

  if (!admin) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!admin.isMasterAdmin) {
    return c.json({ error: "Forbidden: Master admin only" }, 403);
  }

  await next();
};

