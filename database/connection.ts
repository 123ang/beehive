import mysql from 'mysql2/promise';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../.env' });

// Connection string from environment
const connectionString = process.env.DATABASE_URL || "mysql://beehive_user:920214%40Ang@localhost:3306/beehive";

// Parse connection string
function parseConnectionString(url: string) {
  const parsed = new URL(url);
  const password = decodeURIComponent(parsed.password || "");
  
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: password,
    database: parsed.pathname.slice(1),
  };
}

const poolConfig = parseConnectionString(connectionString);

// Create MySQL connection pool
const pool = mysql.createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export interface QueryParams {
  query: string;
  params: any[];
}

/**
 * Execute a single query
 */
export async function executeQuery(query: string, params: any[] = []): Promise<any> {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(query, params);
    return results;
  } finally {
    connection.release();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function executeTransaction(queries: QueryParams[]): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const { query, params } of queries) {
      await connection.execute(query, params);
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

