import { Hono } from "hono";
import { db } from "../../db";
import { nftCollections } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";

const adminNftCollectionsRouter = new Hono();
adminNftCollectionsRouter.use("/*", adminAuth);

// Get all NFT collections
adminNftCollectionsRouter.get("/", requirePermission("nft.create"), async (c) => {
  const collections = await db
    .select()
    .from(nftCollections)
    .orderBy(desc(nftCollections.createdAt));

  return c.json({ success: true, data: collections });
});

// Create NFT collection
adminNftCollectionsRouter.post("/", requirePermission("nft.create"), async (c) => {
  const admin = c.get("admin");
  const { shortName, name, description, bccReward, maxSupply, active } = await c.req.json();

  await db.insert(nftCollections).values({
    shortName,
    name,
    description: description || null,
    bccReward: bccReward || "0",
    maxSupply,
    active: active !== undefined ? active : true,
    createdBy: admin.adminId,
    minted: 0,
  });

  // Get inserted collection ID (MySQL doesn't support returningId)
  const [inserted] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.createdBy, admin.adminId))
    .orderBy(desc(nftCollections.createdAt))
    .limit(1);

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_nft_collection",
    metadata: { collectionId: inserted.id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: inserted.id } });
});

// Update NFT collection
adminNftCollectionsRouter.put("/:id", requirePermission("nft.update"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { shortName, name, description, bccReward, maxSupply, active } = await c.req.json();

  const updateData: any = {};
  if (shortName !== undefined) updateData.shortName = shortName;
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (bccReward !== undefined) updateData.bccReward = bccReward.toString();
  if (maxSupply !== undefined) updateData.maxSupply = maxSupply;
  if (active !== undefined) updateData.active = active;

  await db.update(nftCollections).set(updateData).where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_nft_collection",
    metadata: { collectionId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Mint NFTs from collection
adminNftCollectionsRouter.post("/:id/mint", requirePermission("nft.mint"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { toAddress, quantity } = await c.req.json();

  // Get collection
  const [collection] = await db
    .select()
    .from(nftCollections)
    .where(eq(nftCollections.id, id))
    .limit(1);

  if (!collection) {
    return c.json({ error: "Collection not found" }, 404);
  }

  // Check supply
  if (collection.minted + quantity > collection.maxSupply) {
    return c.json({ error: "Exceeds max supply" }, 400);
  }

  // Update minted count
  await db
    .update(nftCollections)
    .set({ minted: collection.minted + quantity })
    .where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.mint_nft",
    metadata: { collectionId: id, toAddress, quantity },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({
    success: true,
    message: `Minted ${quantity} NFTs to ${toAddress}`,
  });
});

// Delete NFT collection
adminNftCollectionsRouter.delete("/:id", requirePermission("nft.delete"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));

  await db.delete(nftCollections).where(eq(nftCollections.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_nft_collection",
    metadata: { collectionId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

export default adminNftCollectionsRouter;

