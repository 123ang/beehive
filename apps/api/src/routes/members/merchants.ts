import { Hono } from "hono";
import { db } from "../../db";
import { merchants, merchantAds } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

const memberMerchantsRouter = new Hono();

/**
 * Get active merchants for Discover section
 * GET /api/members/merchants
 */
memberMerchantsRouter.get("/", async (c) => {
  try {
    const merchantsList = await db
      .select()
      .from(merchants)
      .where(eq(merchants.active, true))
      .orderBy(desc(merchants.createdAt));

    return c.json({
      success: true,
      data: merchantsList,
    });
  } catch (error) {
    console.error("Get merchants error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get single merchant details
 * GET /api/members/merchants/:id
 */
memberMerchantsRouter.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, id))
      .limit(1);

    if (!merchant) {
      return c.json({ error: "Merchant not found" }, 404);
    }

    // Get merchant ads
    const ads = await db
      .select()
      .from(merchantAds)
      .where(eq(merchantAds.merchantId, id))
      .where(eq(merchantAds.active, true));

    return c.json({
      success: true,
      data: {
        ...merchant,
        ads,
      },
    });
  } catch (error) {
    console.error("Get merchant details error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get active merchant ads
 * GET /api/members/merchants/ads
 */
memberMerchantsRouter.get("/ads/active", async (c) => {
  try {
    const ads = await db
      .select()
      .from(merchantAds)
      .where(eq(merchantAds.active, true))
      .orderBy(desc(merchantAds.createdAt))
      .limit(20);

    return c.json({
      success: true,
      data: ads,
    });
  } catch (error) {
    console.error("Get merchant ads error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default memberMerchantsRouter;

