// ============================================
// DATABASE CONNECTION (MySQL)
// ============================================

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Connection string from environment
const connectionString = process.env.DATABASE_URL || "mysql://beehive:password@localhost:3306/beehive";

// Parse connection string
function parseConnectionString(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
  };
}

// Create MySQL connection pool
const poolConfig = parseConnectionString(connectionString);

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
