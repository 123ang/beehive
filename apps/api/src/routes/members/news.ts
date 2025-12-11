import { Hono } from "hono";
import { db } from "../../db";
import { newsArticles, newsTranslations } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";

const memberNewsRouter = new Hono();

/**
 * Get published news for members
 * GET /api/members/news
 */
memberNewsRouter.get("/", async (c) => {
  try {
    const { lang = "en" } = c.req.query();

    // Get published articles
    const articles = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.status, "published"))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(50);

    // Get translations
    const articlesWithTranslations = await Promise.all(
      articles.map(async (article) => {
        const [translation] = await db
          .select()
          .from(newsTranslations)
          .where(
            and(
              eq(newsTranslations.articleId, article.id),
              eq(newsTranslations.language, lang)
            )
          )
          .limit(1);

        // Fallback to English if translation not found
        if (!translation) {
          const [enTranslation] = await db
            .select()
            .from(newsTranslations)
            .where(
              and(
                eq(newsTranslations.articleId, article.id),
                eq(newsTranslations.language, "en")
              )
            )
            .limit(1);

          return {
            ...article,
            title: enTranslation?.title || "Untitled",
            description: enTranslation?.description || null,
            content: enTranslation?.content || "",
            language: "en",
          };
        }

        return {
          ...article,
          title: translation.title,
          description: translation.description || null,
          content: translation.content,
          language: lang,
        };
      })
    );

    return c.json({
      success: true,
      data: articlesWithTranslations,
    });
  } catch (error) {
    console.error("Get member news error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * Get single news article
 * GET /api/members/news/:id
 */
memberNewsRouter.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { lang = "en" } = c.req.query();

    const [article] = await db
      .select()
      .from(newsArticles)
      .where(
        and(
          eq(newsArticles.id, id),
          eq(newsArticles.status, "published")
        )
      )
      .limit(1);

    if (!article) {
      return c.json({ error: "Article not found" }, 404);
    }

    // Try to get translation for requested language
    const [translation] = await db
      .select()
      .from(newsTranslations)
      .where(
        and(
          eq(newsTranslations.articleId, id),
          eq(newsTranslations.language, lang)
        )
      )
      .limit(1);

    // Fallback to English if translation not found
    if (!translation) {
      const [enTranslation] = await db
        .select()
        .from(newsTranslations)
        .where(
          and(
            eq(newsTranslations.articleId, id),
            eq(newsTranslations.language, "en")
          )
        )
        .limit(1);

      return c.json({
        success: true,
        data: {
          ...article,
          title: enTranslation?.title || "Untitled",
          description: enTranslation?.description || null,
          content: enTranslation?.content || "",
          language: "en",
        },
      });
    }

    return c.json({
      success: true,
      data: {
        ...article,
        title: translation.title,
        description: translation.description || null,
        content: translation.content,
        language: lang,
      },
    });
  } catch (error) {
    console.error("Get news article error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default memberNewsRouter;

