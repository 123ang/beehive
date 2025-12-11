import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file from apps/api directory (current working directory when running from apps/api)
config({ path: resolve(process.cwd(), ".env") });

// Also try loading from root .env if api/.env doesn't have DATABASE_URL
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), "../../.env") });
}

const connectionString = process.env.DATABASE_URL || "mysql://root:@localhost:3306/beehive";

// Parse connection string for drizzle-kit
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

const dbConfig = parseConnectionString(connectionString);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  driver: "mysql2",
  dbCredentials: {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  },
});
