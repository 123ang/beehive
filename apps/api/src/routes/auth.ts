// ============================================
// AUTH ROUTES
// ============================================

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { verifyMessage } from "viem";
import { db, users, members } from "../db";
import { eq } from "drizzle-orm";
import { generateToken, generateNonce } from "../lib/jwt";
import { authRateLimit } from "../middleware/rateLimit";
import { generateMemberId, generateReferralCode } from "../utils/referralCode";
import { matrixService } from "../services/MatrixService";

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

/**
 * Validate referral code
 * GET /api/auth/validate-referral-code?code=xxxxx
 */
authRoutes.get("/validate-referral-code", async (c) => {
  const code = c.req.query("code");
  
  if (!code) {
    return c.json({ success: false, error: "Referral code is required" }, 400);
  }

  // Check if referral code exists in members table
  const member = await db.query.members.findFirst({
    where: eq(members.referralCode, code),
  });

  if (!member) {
    return c.json({ 
      success: false, 
      error: "Invalid referral code",
      valid: false 
    }, 400);
  }

  return c.json({
    success: true,
    data: {
      valid: true,
      referralCode: member.referralCode,
      sponsorWallet: member.walletAddress,
      sponsorLevel: member.currentLevel,
      sponsorUsername: member.username,
    },
  });
});

/**
 * Register/Update user profile
 * Creates a user if they don't exist, or updates their profile
 */
const registerSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  username: z.string().min(1).max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  referralCode: z.string().min(1, "Referral code is required"),
});

authRoutes.post("/register", authRateLimit, zValidator("json", registerSchema), async (c) => {
  const { walletAddress, username, email, referralCode } = c.req.valid("json");
  const normalizedAddress = walletAddress.toLowerCase();

  try {
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.walletAddress, normalizedAddress),
    });

    if (existingUser) {
      // Update existing user
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.walletAddress, normalizedAddress));

      // Check if member exists, create if not
      const existingMember = await db.query.members.findFirst({
        where: eq(members.walletAddress, normalizedAddress),
      });

      if (!existingMember) {
        // Find sponsor member by referral code (required)
        const sponsorMember = await db.query.members.findFirst({
          where: eq(members.referralCode, referralCode),
        });
        
        if (!sponsorMember) {
          return c.json(
            {
              success: false,
              error: "Invalid referral code. Please provide a valid referral code.",
            },
            400
          );
        }
        
        const sponsorMemberId = sponsorMember.id;

        // Generate member ID and referral code
        const memberIdString = existingUser.memberId || generateMemberId(existingUser.id);
        
        // Generate unique referral code if user doesn't have one
        let finalReferralCode: string;
        if (existingUser.referralCode) {
          finalReferralCode = existingUser.referralCode;
        } else {
          let attempts = 0;
          const maxAttempts = 10;
          
          do {
            finalReferralCode = generateReferralCode();
            attempts++;
            
            // Check if referral code already exists
            const existingCode = await db.query.members.findFirst({
              where: eq(members.referralCode, finalReferralCode),
            });
            
            if (!existingCode) {
              break; // Unique code found
            }
            
            if (attempts >= maxAttempts) {
              throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
            }
          } while (true);
        }

        // Create member with level = 0
        await db
          .insert(members)
          .values({
            walletAddress: normalizedAddress,
            username: username || existingUser.username || null,
            currentLevel: 0,
            sponsorId: sponsorMemberId,
            memberId: memberIdString,
            referralCode: finalReferralCode,
          });

        // Get the inserted member
        const newMember = await db.query.members.findFirst({
          where: eq(members.walletAddress, normalizedAddress),
        });

        if (!newMember) {
          throw new Error("Failed to create member");
        }

        // Find placement position in matrix tree
        const placement = await matrixService.findPlacement(sponsorMemberId);

        if (!placement) {
          // If no placement found, still create the member but log a warning
          console.warn(`No available placement position for member ${newMember.id} under sponsor ${sponsorMemberId}`);
        } else {
          // Place member in matrix tree structure
          await matrixService.placeMember(
            newMember.id,
            placement.parentId,
            placement.position,
            sponsorMemberId
          );
        }

        // Update user with member ID if not set
        if (!existingUser.memberId) {
          await db
            .update(users)
            .set({
              memberId: memberIdString,
            })
            .where(eq(users.id, existingUser.id));
        }
      }

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.walletAddress, normalizedAddress),
      });

      return c.json({
        success: true,
        data: {
          id: updatedUser!.id,
          walletAddress: updatedUser!.walletAddress,
          username: updatedUser!.username,
          email: updatedUser!.email,
          referralCode: updatedUser!.referralCode,
          memberId: updatedUser!.memberId,
        },
      });
    } else {
      // Create new user
      let sponsorId: number | undefined;
      let sponsorAddress: string | undefined;

      // Find sponsor by referral code (required)
      // First check members table
      const sponsorMember = await db.query.members.findFirst({
        where: eq(members.referralCode, referralCode),
      });
      
      if (!sponsorMember) {
        return c.json(
          {
            success: false,
            error: "Invalid referral code. Please provide a valid referral code.",
          },
          400
        );
      }
      
      // Find the user associated with this member
      const sponsor = await db.query.users.findFirst({
        where: eq(users.walletAddress, sponsorMember.walletAddress),
      });
      
      if (sponsor) {
        sponsorId = sponsor.id;
        sponsorAddress = sponsor.walletAddress;
      }

      await db
        .insert(users)
        .values({
          walletAddress: normalizedAddress,
          username: username || null,
          email: email || null,
          sponsorId: sponsorId || null,
          sponsorAddress: sponsorAddress || null,
        });

      // Get the inserted user (MySQL doesn't support .returning())
      const insertedUser = await db.query.users.findFirst({
        where: eq(users.walletAddress, normalizedAddress),
      });

      if (!insertedUser) {
        throw new Error("Failed to create user");
      }

      // Check if member already exists
      const existingMember = await db.query.members.findFirst({
        where: eq(members.walletAddress, normalizedAddress),
      });

      if (!existingMember) {
        // Find sponsor member by referral code (required)
        const sponsorMember = await db.query.members.findFirst({
          where: eq(members.referralCode, referralCode),
        });
        
        if (!sponsorMember) {
          return c.json(
            {
              success: false,
              error: "Invalid referral code. Please provide a valid referral code.",
            },
            400
          );
        }
        
        const sponsorMemberId = sponsorMember.id;

        // Generate member ID and referral code
        const memberIdString = generateMemberId(insertedUser.id);
        
        // Generate unique referral code
        let finalReferralCode: string;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
          finalReferralCode = generateReferralCode();
          attempts++;
          
          // Check if referral code already exists
          const existingCode = await db.query.members.findFirst({
            where: eq(members.referralCode, finalReferralCode),
          });
          
          if (!existingCode) {
            break; // Unique code found
          }
          
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
          }
        } while (true);

        // Create member with level = 0
        await db
          .insert(members)
          .values({
            walletAddress: normalizedAddress,
            username: username || null,
            currentLevel: 0,
            sponsorId: sponsorMemberId,
            memberId: memberIdString,
            referralCode: finalReferralCode,
          });

        // Get the inserted member
        const newMember = await db.query.members.findFirst({
          where: eq(members.walletAddress, normalizedAddress),
        });

        if (!newMember) {
          throw new Error("Failed to create member");
        }

        // Find placement position in matrix tree
        const placement = await matrixService.findPlacement(sponsorMemberId);

        if (!placement) {
          // If no placement found, still create the member but log a warning
          console.warn(`No available placement position for member ${newMember.id} under sponsor ${sponsorMemberId}`);
        } else {
          // Place member in matrix tree structure
          await matrixService.placeMember(
            newMember.id,
            placement.parentId,
            placement.position,
            sponsorMemberId
          );
        }

        // Update user with member ID
        await db
          .update(users)
          .set({
            memberId: memberIdString,
          })
          .where(eq(users.id, insertedUser.id));
      }

      // Get updated user
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.walletAddress, normalizedAddress),
      });

      return c.json({
        success: true,
        data: {
          id: updatedUser!.id,
          walletAddress: updatedUser!.walletAddress,
          username: updatedUser!.username,
          email: updatedUser!.email,
          referralCode: updatedUser!.referralCode,
          memberId: updatedUser!.memberId,
        },
      });
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Registration failed",
      },
      500
    );
  }
});

