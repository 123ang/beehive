import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { newsletterSubscriptions } from "../db/schema";
import { eq } from "drizzle-orm";

export const newsletterRoutes = new Hono();

// Validation schema
const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Subscribe to newsletter
 * POST /api/newsletter/subscribe
 */
newsletterRoutes.post(
  "/subscribe",
  zValidator("json", subscribeSchema),
  async (c) => {
    try {
      const { email } = c.req.valid("json");
      const emailLower = email.toLowerCase().trim();

      // Check if email already exists
      const [existing] = await db
        .select()
        .from(newsletterSubscriptions)
        .where(eq(newsletterSubscriptions.email, emailLower))
        .limit(1);

      if (existing) {
        // If already subscribed and active, return success
        if (existing.status === "active") {
          return c.json({
            success: true,
            message: "You are already subscribed. Thanks for the support.",
            alreadySubscribed: true,
          });
        }

        // If unsubscribed, reactivate
        await db
          .update(newsletterSubscriptions)
          .set({
            status: "active",
            subscribedAt: new Date(),
            unsubscribedAt: null,
          })
          .where(eq(newsletterSubscriptions.id, existing.id));

        return c.json({
          success: true,
          message: "Welcome back! You have been resubscribed.",
        });
      }

      // Create new subscription
      await db.insert(newsletterSubscriptions).values({
        email: emailLower,
        status: "active",
      });

      return c.json({
        success: true,
        message: "Thank you for subscribing to our newsletter!",
      });
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);

      // Handle duplicate email error
      if (error.code === "ER_DUP_ENTRY" || error.message?.includes("Duplicate")) {
        return c.json(
          {
            success: false,
            error: "This email is already subscribed.",
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          error: "Failed to subscribe. Please try again later.",
        },
        500
      );
    }
  }
);

/**
 * Unsubscribe from newsletter
 * POST /api/newsletter/unsubscribe
 */
newsletterRoutes.post(
  "/unsubscribe",
  zValidator("json", subscribeSchema),
  async (c) => {
    try {
      const { email } = c.req.valid("json");
      const emailLower = email.toLowerCase().trim();

      const [subscription] = await db
        .select()
        .from(newsletterSubscriptions)
        .where(eq(newsletterSubscriptions.email, emailLower))
        .limit(1);

      if (!subscription) {
        return c.json(
          {
            success: false,
            error: "Email not found in our subscription list.",
          },
          404
        );
      }

      if (subscription.status === "unsubscribed") {
        return c.json({
          success: true,
          message: "You are already unsubscribed.",
        });
      }

      await db
        .update(newsletterSubscriptions)
        .set({
          status: "unsubscribed",
          unsubscribedAt: new Date(),
        })
        .where(eq(newsletterSubscriptions.id, subscription.id));

      return c.json({
        success: true,
        message: "You have been unsubscribed from our newsletter.",
      });
    } catch (error) {
      console.error("Newsletter unsubscribe error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to unsubscribe. Please try again later.",
        },
        500
      );
    }
  }
);

