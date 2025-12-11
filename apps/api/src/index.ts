// ============================================
// BEEHIVE API - MAIN ENTRY POINT
// ============================================

import { config } from "dotenv";

// Load environment variables from .env file
config({ path: ".env" });

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
const port = parseInt(process.env.API_PORT || "4000");

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

