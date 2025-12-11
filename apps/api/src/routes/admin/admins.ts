import { Hono } from "hono";
import { db } from "../../db";
import { admins, adminRoles, adminPermissions } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";
// ESM-compatible bcrypt import
import * as bcrypt from "bcryptjs";

const adminAdminsRouter = new Hono();
adminAdminsRouter.use("/*", adminAuth);

// Get all admins (Master Admin only)
adminAdminsRouter.get("/", requirePermission("admin.list"), async (c) => {
  const adminList = await db
    .select({
      id: admins.id,
      email: admins.email,
      name: admins.name,
      roleId: admins.roleId,
      active: admins.active,
      lastLogin: admins.lastLogin,
      createdAt: admins.createdAt,
      roleName: adminRoles.name,
      isMasterAdmin: adminRoles.isMasterAdmin,
    })
    .from(admins)
    .leftJoin(adminRoles, eq(admins.roleId, adminRoles.id))
    .orderBy(desc(admins.createdAt));

  return c.json({ success: true, data: adminList });
});

// Get all roles
adminAdminsRouter.get("/roles", requirePermission("admin.list"), async (c) => {
  const roles = await db.select().from(adminRoles).orderBy(desc(adminRoles.createdAt));

  return c.json({ success: true, data: roles });
});

// Get role with permissions
adminAdminsRouter.get("/roles/:id", requirePermission("admin.list"), async (c) => {
  const roleId = parseInt(c.req.param("id"));

  const [role] = await db
    .select()
    .from(adminRoles)
    .where(eq(adminRoles.id, roleId))
    .limit(1);

  if (!role) {
    return c.json({ error: "Role not found" }, 404);
  }

  const permissions = await db
    .select()
    .from(adminPermissions)
    .where(eq(adminPermissions.roleId, roleId));

  return c.json({
    success: true,
    data: {
      ...role,
      permissions: permissions.map((p) => p.permission),
    },
  });
});

// Create role
adminAdminsRouter.post("/roles", requirePermission("admin.create"), async (c) => {
  const admin = c.get("admin");
  const { name, description, isMasterAdmin, permissions } = await c.req.json();

  // Insert role
  const result = await db.insert(adminRoles).values({
    name,
    description,
    isMasterAdmin: isMasterAdmin || false,
  });

  // Get inserted role ID
  const [inserted] = await db
    .select()
    .from(adminRoles)
    .where(eq(adminRoles.name, name))
    .orderBy(desc(adminRoles.createdAt))
    .limit(1);

  // Insert permissions
  if (permissions && Array.isArray(permissions) && permissions.length > 0) {
    await db.insert(adminPermissions).values(
      permissions.map((permission: string) => ({
        roleId: inserted.id,
        permission,
      }))
    );
  }

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_role",
    metadata: { roleId: inserted.id, roleName: name },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update role
adminAdminsRouter.put("/roles/:id", requirePermission("admin.update"), async (c) => {
  const admin = c.get("admin");
  const roleId = parseInt(c.req.param("id"));
  const { name, description, isMasterAdmin, permissions } = await c.req.json();

  // Update role
  await db
    .update(adminRoles)
    .set({ name, description, isMasterAdmin: isMasterAdmin || false })
    .where(eq(adminRoles.id, roleId));

  // Delete existing permissions
  await db.delete(adminPermissions).where(eq(adminPermissions.roleId, roleId));

  // Insert new permissions
  if (permissions && Array.isArray(permissions) && permissions.length > 0) {
    await db.insert(adminPermissions).values(
      permissions.map((permission: string) => ({
        roleId,
        permission,
      }))
    );
  }

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_role",
    metadata: { roleId },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Delete role
adminAdminsRouter.delete("/roles/:id", requirePermission("admin.delete"), async (c) => {
  const admin = c.get("admin");
  const roleId = parseInt(c.req.param("id"));

  // Check if role is in use
  const [adminUsingRole] = await db
    .select()
    .from(admins)
    .where(eq(admins.roleId, roleId))
    .limit(1);

  if (adminUsingRole) {
    return c.json({ error: "Cannot delete role that is in use" }, 400);
  }

  // Delete permissions first
  await db.delete(adminPermissions).where(eq(adminPermissions.roleId, roleId));

  // Delete role
  await db.delete(adminRoles).where(eq(adminRoles.id, roleId));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_role",
    metadata: { roleId },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Create admin
adminAdminsRouter.post("/", requirePermission("admin.create"), async (c) => {
  const admin = c.get("admin");
  const { email, password, name, roleId } = await c.req.json();

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert admin
  const result = await db.insert(admins).values({
    email: email.toLowerCase(),
    passwordHash,
    name,
    roleId,
    active: true,
  });

  // Get inserted admin ID
  const [inserted] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email.toLowerCase()))
    .orderBy(desc(admins.createdAt))
    .limit(1);

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_admin",
    metadata: { adminId: inserted.id, email },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update admin
adminAdminsRouter.put("/:id", requirePermission("admin.update"), async (c) => {
  const admin = c.get("admin");
  const adminId = parseInt(c.req.param("id"));
  const { email, password, name, roleId, active } = await c.req.json();

  const updateData: any = {};
  if (email) updateData.email = email.toLowerCase();
  if (name) updateData.name = name;
  if (roleId) updateData.roleId = roleId;
  if (active !== undefined) updateData.active = active;
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  await db.update(admins).set(updateData).where(eq(admins.id, adminId));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_admin",
    metadata: { adminId },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Delete admin
adminAdminsRouter.delete("/:id", requirePermission("admin.delete"), async (c) => {
  const admin = c.get("admin");
  const adminId = parseInt(c.req.param("id"));

  // Prevent deleting yourself
  if (adminId === admin.adminId) {
    return c.json({ error: "Cannot delete your own account" }, 400);
  }

  await db.delete(admins).where(eq(admins.id, adminId));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_admin",
    metadata: { adminId },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

export default adminAdminsRouter;

