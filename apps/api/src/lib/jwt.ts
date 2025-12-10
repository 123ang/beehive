// ============================================
// JWT UTILITIES
// ============================================

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "beehive-super-secret-jwt-key-change-in-production"
);

const JWT_ISSUER = "beehive-api";
const JWT_AUDIENCE = "beehive-app";

export interface TokenPayload extends JWTPayload {
  userId: number;
  walletAddress: string;
  isAdmin: boolean;
}

/**
 * Generate a JWT token
 */
export async function generateToken(payload: Omit<TokenPayload, "iat" | "exp" | "iss" | "aud">): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as TokenPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Generate a random nonce for SIWE
 */
export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

