#!/usr/bin/env node
/**
 * Standalone script to create admin users
 * Usage: node scripts/createAdmin.js
 * 
 * This script can use different database credentials via command line or environment variables
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file (optional)
let envVars = {};
try {
  const envPath = resolve(__dirname, "../../.env");
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
} catch (error) {
  console.warn("Could not load .env file, using environment variables only");
}

// Get database credentials from command line args or environment
const getDbConfig = () => {
  // Check command line arguments
  const args = process.argv.slice(2);
  const dbUser = args.find(arg => arg.startsWith("--user="))?.split("=")[1] || 
                 process.env.DB_USER || 
                 envVars.DB_USER || 
                 "beehive_user";
  
  const dbPassword = args.find(arg => arg.startsWith("--password="))?.split("=")[1] || 
                     process.env.DB_PASSWORD || 
                     envVars.DB_PASSWORD || 
                     "920214@Ang";
  
  const dbHost = args.find(arg => arg.startsWith("--host="))?.split("=")[1] || 
                 process.env.DB_HOST || 
                 envVars.DB_HOST || 
                 "localhost";
  
  const dbPort = parseInt(args.find(arg => arg.startsWith("--port="))?.split("=")[1] || 
                 process.env.DB_PORT || 
                 envVars.DB_PORT || 
                 "3306");
  
  const dbName = args.find(arg => arg.startsWith("--database="))?.split("=")[1] || 
                 process.env.DB_NAME || 
                 envVars.DB_NAME || 
                 "beehive";

  // Parse DATABASE_URL if available
  const databaseUrl = process.env.DATABASE_URL || envVars.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
      };
    } catch (error) {
      console.warn("Could not parse DATABASE_URL, using individual settings");
    }
  }

  return {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  };
};

async function createAdmin() {
  console.log("🔐 Creating admin users...\n");

  const dbConfig = getDbConfig();
  console.log(`Connecting to database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true,
    });

    console.log("✅ Connected to database\n");

    // 1. Create Master Admin Role
    console.log("1. Creating Master Admin role...");
    const [masterRoleResult] = await connection.execute(
      `INSERT INTO admin_roles (name, description, is_master_admin, created_at) 
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE name=name`,
      ["Master Admin", "Full access to all admin features", true]
    );

    const [masterRoles] = await connection.execute(
      "SELECT id FROM admin_roles WHERE name = ? LIMIT 1",
      ["Master Admin"]
    );
    const masterRole = masterRoles[0];
    console.log(`   ✅ Master Admin role (ID: ${masterRole.id})\n`);

    // 2. Create Operation Role
    console.log("2. Creating Operation role...");
    await connection.execute(
      `INSERT INTO admin_roles (name, description, is_master_admin, created_at) 
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE name=name`,
      ["Operation", "Operations team with most permissions except admin management", false]
    );

    const [operationRoles] = await connection.execute(
      "SELECT id FROM admin_roles WHERE name = ? LIMIT 1",
      ["Operation"]
    );
    const operationRole = operationRoles[0];

    // Add permissions for Operation role
    const operationPermissions = [
      "user.list", "user.view", "user.bulk_import", "user.modify_address",
      "nft.create", "nft.update", "nft.mint",
      "news.create", "news.update", "news.multilingual",
      "class.create", "class.update", "class.manage_meetings",
      "merchant.create", "merchant.update",
      "merchant_ads.create", "merchant_ads.update",
      "logs.view", "dashboard.view",
    ];

    for (const permission of operationPermissions) {
      await connection.execute(
        `INSERT INTO admin_permissions (role_id, permission, created_at) 
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE permission=permission`,
        [operationRole.id, permission]
      );
    }
    console.log(`   ✅ Operation role (ID: ${operationRole.id})\n`);

    // 3. Create Support Role
    console.log("3. Creating Support role...");
    await connection.execute(
      `INSERT INTO admin_roles (name, description, is_master_admin, created_at) 
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE name=name`,
      ["Support", "Customer support team with view and limited edit permissions", false]
    );

    const [supportRoles] = await connection.execute(
      "SELECT id FROM admin_roles WHERE name = ? LIMIT 1",
      ["Support"]
    );
    const supportRole = supportRoles[0];

    const supportPermissions = [
      "user.list", "user.view", "user.modify_address",
      "logs.view", "dashboard.view",
    ];

    for (const permission of supportPermissions) {
      await connection.execute(
        `INSERT INTO admin_permissions (role_id, permission, created_at) 
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE permission=permission`,
        [supportRole.id, permission]
      );
    }
    console.log(`   ✅ Support role (ID: ${supportRole.id})\n`);

    // 4. Create Master Admin User
    console.log("4. Creating Master Admin user...");
    const passwordHash = await bcrypt.hash("admin123", 10);

    await connection.execute(
      `INSERT INTO admins (email, password_hash, name, role_id, active, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         password_hash = VALUES(password_hash),
         active = VALUES(active)`,
      ["admin@beehive.io", passwordHash, "Master Administrator", masterRole.id, true]
    );

    console.log("   ✅ Master Admin user created");
    console.log("      Email: admin@beehive.io");
    console.log("      Password: admin123");
    console.log("      ⚠️  PLEASE CHANGE THIS PASSWORD IN PRODUCTION!\n");

    // 5. Create Operation Admin User
    console.log("5. Creating Operation admin user...");
    const operationPasswordHash = await bcrypt.hash("operation123", 10);

    await connection.execute(
      `INSERT INTO admins (email, password_hash, name, role_id, active, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         password_hash = VALUES(password_hash),
         active = VALUES(active)`,
      ["operation@beehive.io", operationPasswordHash, "Operation Admin", operationRole.id, true]
    );

    console.log("   ✅ Operation admin user created");
    console.log("      Email: operation@beehive.io");
    console.log("      Password: operation123\n");

    console.log("🎉 Admin users created successfully!\n");
    console.log("📝 Summary:");
    console.log("   - 3 roles created (Master Admin, Operation, Support)");
    console.log("   - 2 admin users created");
    console.log("   - Permissions assigned to roles");
    console.log("\n🔐 Login Credentials:");
    console.log("   Master Admin: admin@beehive.io / admin123");
    console.log("   Operation: operation@beehive.io / operation123");

  } catch (error) {
    console.error("❌ Error creating admin users:", error);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.sqlMessage) {
      console.error(`   SQL Error: ${error.sqlMessage}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createAdmin()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

