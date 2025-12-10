// ============================================
// REDIS CLIENT
// ============================================

import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

// Rate limiting helper
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  const ttl = await redis.ttl(key);
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetIn: ttl > 0 ? ttl : windowSeconds,
  };
}

// Session management
export async function setSession(
  sessionId: string,
  data: object,
  expirySeconds: number
): Promise<void> {
  await redis.setex(`session:${sessionId}`, expirySeconds, JSON.stringify(data));
}

export async function getSession<T>(sessionId: string): Promise<T | null> {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(`cache:${key}`);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet(
  key: string,
  data: unknown,
  expirySeconds: number = 300
): Promise<void> {
  await redis.setex(`cache:${key}`, expirySeconds, JSON.stringify(data));
}

export async function cacheDelete(key: string): Promise<void> {
  await redis.del(`cache:${key}`);
}

