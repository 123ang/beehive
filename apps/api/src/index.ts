// ============================================
// BEEHIVE API - MAIN ENTRY POINT
// ============================================

// Load environment variables from .env file
// In production, PM2 sets environment variables, so dotenv is optional
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Manually load .env file (ESM-compatible, no dynamic require)
try {
  const envPath = resolve(__dirname, "../../.env");
  const envFile = readFileSync(envPath, "utf-8");
  const envLines = envFile.split("\n");
  
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
  console.log("✅ Loaded .env file from:", envPath);
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
} catch (error) {
  // .env file not found or can't be read - use system/PM2 environment variables
  // This is fine in production where PM2 sets env vars
  console.warn("⚠️ Could not load .env file, using system/PM2 environment variables");
}

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { authRoutes } from "./routes/auth";
import { memberRoutes } from "./routes/members";
import { adminRoutes } from "./routes/admin";
import { referralRoutes } from "./routes/referral";
import { newsletterRoutes } from "./routes/newsletter";
import { checkDatabaseConnection } from "./db";
import { redis } from "./lib/redis";

// Create Hono app
const app = new Hono();

// Global middleware
app.use("*", cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://beehive-lifestyle.info",
    "https://www.beehive-lifestyle.info",
    "https://beehive.io",
    "https://www.beehive.io",
  ],
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));

app.use("*", logger());
app.use("*", prettyJSON());

// Health check endpoint
app.get("/api/health", async (c) => {
  const dbHealthy = await checkDatabaseConnection();
  
  let redisHealthy = false;
  try {
    await redis.ping();
    redisHealthy = true;
  } catch (e) {
    console.error("Redis health check failed:", e);
  }

  const status = dbHealthy && redisHealthy ? "healthy" : "degraded";

  return c.json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? "connected" : "disconnected",
      redis: redisHealthy ? "connected" : "disconnected",
    },
  });
});

// API Routes
app.route("/api/auth", authRoutes);
app.route("/api/members", memberRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/referral", referralRoutes);
app.route("/api/newsletter", newsletterRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: "Not Found",
    path: c.req.path,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json({
    success: false,
    error: process.env.NODE_ENV === "production" 
      ? "Internal Server Error" 
      : err.message,
  }, 500);
});

// Start server
const port = parseInt(process.env.API_PORT || "4001");

console.log(`
🐝 ================================================
   BEEHIVE API SERVER
   ================================================
   
   Port: ${port}
   Environment: ${process.env.NODE_ENV || "development"}
   
   Endpoints:
   - Health: http://localhost:${port}/api/health
   - Auth:   http://localhost:${port}/api/auth/*
   - Members: http://localhost:${port}/api/members/*
   - Admin:  http://localhost:${port}/api/admin/*
   - Newsletter: http://localhost:${port}/api/newsletter/*
   
🐝 ================================================
`);

serve({
  fetch: app.fetch,
  port,
});

