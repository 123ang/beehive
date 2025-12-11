#!/usr/bin/env tsx
/**
 * Quick script to check if API endpoints are working
 */

import { checkDatabaseConnection } from "../db/index.js";
import { redis } from "../lib/redis.js";

async function checkApi() {
  console.log("Checking API setup...\n");

  // Check database
  console.log("1. Checking database connection...");
  const dbOk = await checkDatabaseConnection();
  console.log(`   ${dbOk ? "✓" : "✗"} Database: ${dbOk ? "Connected" : "Disconnected"}\n`);

  // Check Redis
  console.log("2. Checking Redis connection...");
  try {
    await redis.ping();
    console.log("   ✓ Redis: Connected\n");
  } catch (error) {
    console.log("   ✗ Redis: Disconnected\n");
  }

  // Check environment
  console.log("3. Checking environment variables...");
  console.log(`   API_PORT: ${process.env.API_PORT || "4000 (default)"}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? "Set" : "Not set (using default)"}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "Not set"}\n`);

  console.log("API server should be running on:");
  console.log(`   http://localhost:${process.env.API_PORT || 4000}\n`);
  
  process.exit(0);
}

checkApi();

