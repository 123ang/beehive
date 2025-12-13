// ============================================
// DATABASE CONNECTION (MySQL)
// ============================================

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
// Environment variables are loaded in index.ts
// No need to load again here - they're already in process.env

// Lazy initialization - only create connection when first accessed
let _pool: mysql.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

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

// Initialize database connection (lazy)
function initializeDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Provide helpful error message
    const errorMsg = 
      "DATABASE_URL environment variable is required.\n" +
      "Please set it in your .env file: DATABASE_URL=mysql://user:password@host:port/database\n" +
      `Current process.env.DATABASE_URL: ${process.env.DATABASE_URL || "undefined"}\n` +
      "Make sure the .env file is in the root directory and loaded before using the database.";
    throw new Error(errorMsg);
  }

  // Log connection info (without password) for debugging
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(connectionString);
    console.log(`Database connection: ${url.username}@${url.hostname}:${url.port}/${url.pathname.slice(1)}`);
  }

  // Create MySQL connection pool
  const poolConfig = parseConnectionString(connectionString);

  // Log connection config (without password) for debugging
  console.log(`🔌 Connecting to MySQL: ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);

  _pool = mysql.createPool({
    ...poolConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  // Create drizzle instance with schema
  _db = drizzle(_pool, { schema, mode: "default" });
  
  return _db;
}

// Export db with lazy initialization
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const dbInstance = initializeDb();
    return (dbInstance as any)[prop];
  }
});

// Export schema for convenience
export * from "./schema";
export { memberActivityLogs } from "./schema";

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    initializeDb(); // Ensure DB is initialized
    if (!_pool) {
      throw new Error("Database pool not initialized");
    }
    const connection = await _pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
