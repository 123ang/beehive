// ============================================
// DATABASE CONNECTION (MySQL)
// ============================================

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
// Environment variables are loaded in index.ts
// No need to load again here - they're already in process.env

// Connection string from environment
// Default to beehive_user if DATABASE_URL not set
const connectionString = process.env.DATABASE_URL || "mysql://beehive_user:920214%40Ang@localhost:3306/beehive";

// Log connection info (without password) for debugging
if (process.env.NODE_ENV !== "production") {
  const url = new URL(connectionString);
  console.log(`Database connection: ${url.username}@${url.hostname}:${url.port}/${url.pathname.slice(1)}`);
}

// Parse connection string
function parseConnectionString(url: string) {
  const parsed = new URL(url);
  // Manually decode password - URL parser may not decode it automatically
  // %40 needs to be decoded to @
  const password = decodeURIComponent(parsed.password || "");
  
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: password, // Now correctly decoded: "920214@Ang"
    database: parsed.pathname.slice(1),
  };
}

// Create MySQL connection pool
const poolConfig = parseConnectionString(connectionString);

// Log connection config (without password) for debugging
console.log(`🔌 Connecting to MySQL: ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);

const pool = mysql.createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Create drizzle instance with schema
export const db = drizzle(pool, { schema, mode: "default" });

// Export schema for convenience
export * from "./schema";
export { memberActivityLogs } from "./schema";

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
