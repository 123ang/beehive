import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL || "mysql://beehive:password@localhost:3306/beehive";

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
