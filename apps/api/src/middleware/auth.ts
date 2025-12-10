// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { verifyToken, type TokenPayload } from "../lib/jwt";

// Extend Hono context to include user
declare module "hono" {
  interface ContextVariableMap {
    user: TokenPayload;
  }
}

/**
 * Authentication middleware - requires valid JWT token
 */
export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Authorization header required" }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload) {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  // Set user in context
  c.set("user", payload);

  await next();
});

/**
 * Admin middleware - requires admin privileges
 */
export const adminMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const user = c.get("user");

  if (!user || !user.isAdmin) {
    return c.json({ success: false, error: "Admin access required" }, 403);
  }

  await next();
});

/**
 * Optional auth middleware - parses token if present but doesn't require it
 */
export const optionalAuthMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    
    if (payload) {
      c.set("user", payload);
    }
  }

  await next();
});

