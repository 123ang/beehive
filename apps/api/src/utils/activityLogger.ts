import { db } from "../db";
import { activityLogs } from "../db/schema";

export interface ActivityLogData {
  actorType: "user" | "admin";
  actorId: string;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an activity to the database
 */
export async function logActivity(data: ActivityLogData) {
  try {
    await db.insert(activityLogs).values({
      actorType: data.actorType,
      actorId: data.actorId,
      action: data.action,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw error to prevent disrupting main flow
  }
}

/**
 * Helper to extract IP address from request
 */
export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip") ||
    headers.get("fastly-client-ip") ||
    headers.get("true-client-ip") ||
    headers.get("forwarded")?.match(/for="?([^;"]+)"?/)?.[1] ||
    undefined
  );
}

/**
 * Helper to extract user agent from request
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get("user-agent") || undefined;
}

