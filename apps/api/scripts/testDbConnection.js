#!/usr/bin/env node
/**
 * Test database connection
 * Usage: node scripts/testDbConnection.js
 */

import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root (3 levels up from scripts/)
let envVars = {};
try {
  const envPath = resolve(__dirname, "../../../.env");
  const envFile = readFileSync(envPath, "utf-8");
  const envLines = envFile.split("\n");
  
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      envVars[key] = value;
    }
  }
  console.log("✅ Loaded .env file from:", envPath);
  console.log("   DATABASE_URL found:", !!envVars.DATABASE_URL);
} catch (error) {
  console.warn("⚠️ Could not load .env file:", error.message);
  console.warn("   Looking for .env at:", resolve(__dirname, "../../../.env"));
  console.warn("   Will use default connection string");
}

// Get DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || envVars.DATABASE_URL || "mysql://beehive_user:920214%40Ang@localhost:3306/beehive";

console.log("Testing database connection...");
console.log("DATABASE_URL:", databaseUrl.replace(/:[^:@]+@/, ":****@")); // Hide password

// Parse connection string
function parseConnectionString(url) {
  const parsed = new URL(url);
  // Manually decode password in case URL parser doesn't decode it
  const password = decodeURIComponent(parsed.password || "");
  
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: password, // Decoded: %40 becomes @
    database: parsed.pathname.slice(1),
  };
}

const config = parseConnectionString(databaseUrl);

console.log("\nConnection config:");
console.log("  Host:", config.host);
console.log("  Port:", config.port);
console.log("  User:", config.user);
console.log("  Password length:", config.password ? config.password.length : 0);
console.log("  Password (first 3 chars):", config.password ? config.password.substring(0, 3) : "(empty)");
console.log("  Password (last 3 chars):", config.password ? config.password.substring(config.password.length - 3) : "(empty)");
console.log("  Database:", config.database);
console.log("\n🔍 Debug: Full password (for testing):", config.password);

async function testConnection() {
  let connection;
  try {
    console.log("\nAttempting to connect...");
    console.log("🔍 Debug - Password being used:", JSON.stringify(config.password));
    console.log("🔍 Debug - Expected password: '920214@Ang'");
    console.log("🔍 Debug - Passwords match:", config.password === "920214@Ang");
    connection = await mysql.createConnection(config);
    
    console.log("✅ Connection successful!");
    
    // Test query
    const [rows] = await connection.execute("SELECT 1 as test");
    console.log("✅ Query test successful:", rows);
    
    // Check if admins table exists
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'admins'",
      [config.database]
    );
    
    if (tables[0].count > 0) {
      console.log("✅ 'admins' table exists");
      
      // Count admins
      const [adminCount] = await connection.execute("SELECT COUNT(*) as count FROM admins");
      console.log(`✅ Found ${adminCount[0].count} admin user(s)`);
    } else {
      console.log("⚠️  'admins' table does not exist");
      console.log("   Run: pnpm db:push");
    }
    
  } catch (error) {
    console.error("\n❌ Connection failed!");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("SQL State:", error.sqlState);
    
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("\n💡 Possible solutions:");
      console.error("   1. Check if user exists: mysql -u root -p -e \"SELECT user, host FROM mysql.user WHERE user='beehive_user';\"");
      console.error("   2. Check password is correct");
      console.error("   3. Grant permissions: GRANT ALL ON beehive.* TO 'beehive_user'@'localhost';");
      console.error("   4. Flush privileges: FLUSH PRIVILEGES;");
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testConnection()
  .then(() => {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

