import { Hono } from "hono";
import { db } from "../../db";
import { merchants, merchantAds } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";

const adminMerchantsRouter = new Hono();
adminMerchantsRouter.use("/*", adminAuth);

// Get all merchants
adminMerchantsRouter.get("/", requirePermission("merchant.create"), async (c) => {
  const merchantsList = await db
    .select()
    .from(merchants)
    .orderBy(desc(merchants.createdAt));

  return c.json({ success: true, data: merchantsList });
});

// Create merchant
adminMerchantsRouter.post("/", requirePermission("merchant.create"), async (c) => {
  const admin = c.get("admin");
  const data = await c.req.json();

  await db.insert(merchants).values({
    ...data,
    createdBy: admin.adminId,
  });

  // Get inserted merchant ID (MySQL doesn't support returningId)
  const [inserted] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.createdBy, admin.adminId))
    .orderBy(desc(merchants.createdAt))
    .limit(1);

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_merchant",
    metadata: { merchantId: inserted.id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update merchant
adminMerchantsRouter.put("/:id", requirePermission("merchant.update"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const data = await c.req.json();

  await db.update(merchants).set(data).where(eq(merchants.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_merchant",
    metadata: { merchantId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Delete merchant
adminMerchantsRouter.delete("/:id", requirePermission("merchant.delete"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));

  await db.delete(merchantAds).where(eq(merchantAds.merchantId, id));
  await db.delete(merchants).where(eq(merchants.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_merchant",
    metadata: { merchantId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Get merchant ads
adminMerchantsRouter.get("/ads", requirePermission("merchant_ads.create"), async (c) => {
  const ads = await db
    .select()
    .from(merchantAds)
    .orderBy(desc(merchantAds.createdAt));

  return c.json({ success: true, data: ads });
});

// Create merchant ad
adminMerchantsRouter.post("/ads", requirePermission("merchant_ads.create"), async (c) => {
  const admin = c.get("admin");
  const data = await c.req.json();

  await db.insert(merchantAds).values({
    ...data,
    createdBy: admin.adminId,
  });

  // Get inserted ad ID (MySQL doesn't support returningId)
  const [inserted] = await db
    .select()
    .from(merchantAds)
    .where(eq(merchantAds.createdBy, admin.adminId))
    .orderBy(desc(merchantAds.createdAt))
    .limit(1);

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update merchant ad
adminMerchantsRouter.put("/ads/:id", requirePermission("merchant_ads.update"), async (c) => {
  const id = parseInt(c.req.param("id"));
  const data = await c.req.json();

  await db.update(merchantAds).set(data).where(eq(merchantAds.id, id));

  return c.json({ success: true });
});

// Delete merchant ad
adminMerchantsRouter.delete("/ads/:id", requirePermission("merchant_ads.delete"), async (c) => {
  const id = parseInt(c.req.param("id"));

  await db.delete(merchantAds).where(eq(merchantAds.id, id));

  return c.json({ success: true });
});

export default adminMerchantsRouter;

