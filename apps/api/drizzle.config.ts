import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file from project root only
// Root .env is at: beehive/.env (two levels up from apps/api/)
const rootEnvPath = resolve(process.cwd(), "../../.env");
config({ path: rootEnvPath });

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
