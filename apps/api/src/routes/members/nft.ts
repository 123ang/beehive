import { Hono } from "hono";
import { db } from "../../db";
import { nftCollections } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

const memberNftRouter = new Hono();

/**
 * Get active NFT collections for purchase
 * GET /api/members/nft
 */
memberNftRouter.get("/", async (c) => {
  try {
    const collections = await db
      .select()
      .from(nftCollections)
      .where(eq(nftCollections.active, true))
      .orderBy(desc(nftCollections.createdAt));

    return c.json({
      success: true,
      data: collections,
    });
  } catch (error) {
    console.error("Get NFT collections error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get single NFT collection details
 * GET /api/members/nft/:id
 */
memberNftRouter.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const [collection] = await db
      .select()
      .from(nftCollections)
      .where(eq(nftCollections.id, id))
      .limit(1);

    if (!collection) {
      return c.json({ error: "NFT collection not found" }, 404);
    }

    return c.json({
      success: true,
      data: collection,
    });
  } catch (error) {
    console.error("Get NFT collection error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default memberNftRouter;

