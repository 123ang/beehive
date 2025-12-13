// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { checkRateLimit } from "../lib/redis";

interface RateLimitOptions {
  limit: number;        // Max requests
  windowSeconds: number; // Time window in seconds
  keyPrefix?: string;   // Prefix for rate limit key
}

/**
 * Create a rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const { limit, windowSeconds, keyPrefix = "rl" } = options;

  return createMiddleware(async (c: Context, next: Next) => {
    // Use IP address as the rate limit key
    const clientIP = 
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";

    const key = `${keyPrefix}:${clientIP}`;

    try {
      const result = await checkRateLimit(key, limit, windowSeconds);

      // Set rate limit headers
      c.header("X-RateLimit-Limit", limit.toString());
      c.header("X-RateLimit-Remaining", result.remaining.toString());
      c.header("X-RateLimit-Reset", result.resetIn.toString());

      if (!result.allowed) {
        return c.json(
          {
            success: false,
            error: "Too many requests",
            retryAfter: result.resetIn,
          },
          429
        );
      }

      await next();
    } catch (error) {
      // If Redis is down, allow the request but log the error
      console.error("Rate limit check failed:", error);
      await next();
    }
  });
}

// Pre-configured rate limiters
export const standardRateLimit = rateLimit({
  limit: 100,
  windowSeconds: 60,
  keyPrefix: "rl:std",
});

export const strictRateLimit = rateLimit({
  limit: 10,
  windowSeconds: 60,
  keyPrefix: "rl:strict",
});

export const authRateLimit = rateLimit({
  limit: 5,
  windowSeconds: 300, // 5 attempts per 5 minutes
  keyPrefix: "rl:auth",
});

/**
 * Financial rate limiter - very strict for withdrawals and purchases
 * Must be used AFTER authentication middleware
 * Uses wallet address from authenticated user
 * Limits: 3 requests per 10 minutes per wallet address
 */
export const financialRateLimit = createMiddleware(async (c: Context, next: Next) => {
  // Get wallet address from authenticated user (must be set by authMiddleware)
  const user = c.get("user");
  const walletAddress = user?.walletAddress?.toLowerCase();

  // Fallback to IP if no wallet address (shouldn't happen if auth is working)
  const rateLimitKey = walletAddress 
    ? `rl:financial:wallet:${walletAddress}`
    : `rl:financial:ip:${c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown"}`;

  try {
    const result = await checkRateLimit(rateLimitKey, 3, 600); // 3 requests per 10 minutes

    // Set rate limit headers
    c.header("X-RateLimit-Limit", "3");
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", result.resetIn.toString());

    if (!result.allowed) {
      return c.json(
        {
          success: false,
          error: "Too many financial requests. Please wait before trying again.",
          retryAfter: result.resetIn,
        },
        429
      );
    }

    await next();
  } catch (error) {
    // If Redis is down, allow the request but log the error
    console.error("Financial rate limit check failed:", error);
    await next();
  }
});

