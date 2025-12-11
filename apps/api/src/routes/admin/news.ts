import { Hono } from "hono";
import { db } from "../../db";
import { newsArticles, newsTranslations } from "../../db/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { adminAuth, requirePermission } from "../../middleware/adminAuth";
import { logActivity, getClientIp, getUserAgent } from "../../utils/activityLogger";

const adminNewsRouter = new Hono();
adminNewsRouter.use("/*", adminAuth);

// Get all news articles
adminNewsRouter.get("/", requirePermission("news.create"), async (c) => {
  const articles = await db
    .select()
    .from(newsArticles)
    .orderBy(desc(newsArticles.createdAt));

  // Get translations for each article
  const articlesWithTranslations = await Promise.all(
    articles.map(async (article) => {
      const translations = await db
        .select()
        .from(newsTranslations)
        .where(eq(newsTranslations.articleId, article.id));
      
      return {
        ...article,
        translations: translations.reduce((acc, t) => ({
          ...acc,
          [t.language]: { title: t.title, content: t.content }
        }), {})
      };
    })
  );

  return c.json({ success: true, data: articlesWithTranslations });
});

// Get single news article
adminNewsRouter.get("/:id", requirePermission("news.create"), async (c) => {
  const id = parseInt(c.req.param("id"));

  const [article] = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.id, id))
    .limit(1);

  if (!article) {
    return c.json({ error: "Article not found" }, 404);
  }

  // Get translations for the article
  const translations = await db
    .select()
    .from(newsTranslations)
    .where(eq(newsTranslations.articleId, id));
  
  return c.json({
    success: true,
    data: {
      ...article,
      translations: translations.reduce((acc, t) => ({
        ...acc,
        [t.language]: { title: t.title, content: t.content }
      }), {})
    }
  });
});

// Create news article
adminNewsRouter.post("/", requirePermission("news.create"), async (c) => {
  const admin = c.get("admin");
  const { slug, status, translations } = await c.req.json();

  await db.insert(newsArticles).values({
    slug,
    status: status || "draft",
    createdBy: admin.adminId,
    publishedAt: status === "published" ? new Date() : null,
  });

  // Get inserted article ID (MySQL doesn't support returningId)
  const [article] = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.createdBy, admin.adminId))
    .orderBy(desc(newsArticles.createdAt))
    .limit(1);

  // Insert translations
  if (translations) {
    for (const [lang, content] of Object.entries(translations as any)) {
      await db.insert(newsTranslations).values({
        articleId: article.id,
        language: lang,
        title: content.title,
        content: content.content,
      });
    }
  }

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.create_news",
    metadata: { articleId: article.id, slug },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true, data: { id: article.id } });
});

// Update news article
adminNewsRouter.put("/:id", requirePermission("news.update"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));
  const { slug, status, translations } = await c.req.json();

  await db
    .update(newsArticles)
    .set({
      slug,
      status,
      publishedAt: status === "published" ? new Date() : null,
    })
    .where(eq(newsArticles.id, id));

  // Update translations
  if (translations) {
    for (const [lang, content] of Object.entries(translations as any)) {
      const [existing] = await db
        .select()
        .from(newsTranslations)
        .where(eq(newsTranslations.articleId, id))
        .where(eq(newsTranslations.language, lang))
        .limit(1);

      if (existing) {
        await db
          .update(newsTranslations)
          .set({ title: content.title, content: content.content })
          .where(eq(newsTranslations.id, existing.id));
      } else {
        await db.insert(newsTranslations).values({
          articleId: id,
          language: lang,
          title: content.title,
          content: content.content,
        });
      }
    }
  }

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.update_news",
    metadata: { articleId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

// Delete news article
adminNewsRouter.delete("/:id", requirePermission("news.delete"), async (c) => {
  const admin = c.get("admin");
  const id = parseInt(c.req.param("id"));

  await db.delete(newsTranslations).where(eq(newsTranslations.articleId, id));
  await db.delete(newsArticles).where(eq(newsArticles.id, id));

  await logActivity({
    actorType: "admin",
    actorId: admin.adminId.toString(),
    action: "admin.delete_news",
    metadata: { articleId: id },
    ipAddress: getClientIp(c.req.raw.headers),
    userAgent: getUserAgent(c.req.raw.headers),
  });

  return c.json({ success: true });
});

export default adminNewsRouter;

