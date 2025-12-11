// ============================================
// AUTH ROUTES
// ============================================

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { verifyMessage } from "viem";
import { db, users } from "../db";
import { eq } from "drizzle-orm";
import { generateToken, generateNonce } from "../lib/jwt";
import { authRateLimit } from "../middleware/rateLimit";

export const authRoutes = new Hono();

// Validation schemas
const nonceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
});

const verifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

/**
 * Get nonce for SIWE (Sign-In with Ethereum)
 */
authRoutes.post("/nonce", authRateLimit, zValidator("json", nonceSchema), async (c) => {
  const { address } = c.req.valid("json");
  const normalizedAddress = address.toLowerCase();

  const nonce = generateNonce();

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.walletAddress, normalizedAddress),
  });

  if (existingUser) {
    // Update existing user
    await db
      .update(users)
      .set({ nonce, updatedAt: new Date() })
      .where(eq(users.walletAddress, normalizedAddress));
  } else {
    // Insert new user
    await db.insert(users).values({
      walletAddress: normalizedAddress,
      nonce,
    });
  }

  // Create SIWE message
  const message = `Welcome to Beehive!

Sign this message to verify your wallet ownership.

Wallet: ${address}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

  return c.json({
    success: true,
    data: {
      message,
      nonce,
    },
  });
});

/**
 * Verify signature and issue JWT
 */
authRoutes.post("/verify", authRateLimit, zValidator("json", verifySchema), async (c) => {
  const { address, message, signature } = c.req.valid("json");
  const normalizedAddress = address.toLowerCase();

  // Get user and nonce
  const user = await db.query.users.findFirst({
    where: eq(users.walletAddress, normalizedAddress),
  });

  if (!user || !user.nonce) {
    return c.json({ success: false, error: "Invalid nonce. Request a new one." }, 400);
  }

  // Verify the message contains the correct nonce
  if (!message.includes(user.nonce)) {
    return c.json({ success: false, error: "Nonce mismatch" }, 400);
  }

  try {
    // Verify signature using viem
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return c.json({ success: false, error: "Invalid signature" }, 401);
    }
  } catch (error) {
    console.error("Signature verification error:", error);
    return c.json({ success: false, error: "Signature verification failed" }, 401);
  }

  // Clear nonce after successful verification
  await db
    .update(users)
    .set({ nonce: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Generate JWT token
  const token = await generateToken({
    userId: user.id,
    walletAddress: normalizedAddress,
    isAdmin: user.isAdmin || false,
  });

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        language: user.language,
        isAdmin: user.isAdmin,
      },
    },
  });
});

/**
 * Get current user info
 */
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Not authenticated" }, 401);
  }

  const token = authHeader.substring(7);
  const { verifyToken } = await import("../lib/jwt");
  const payload = await verifyToken(token);

  if (!payload) {
    return c.json({ success: false, error: "Invalid token" }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      language: user.language,
      isAdmin: user.isAdmin,
    },
  });
});

