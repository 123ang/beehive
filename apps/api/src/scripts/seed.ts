import { db } from "../db";
import { adminRoles, adminPermissions, admins } from "../db/schema";
import { eq } from "drizzle-orm";
// ESM-compatible bcrypt import
import * as bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Create Master Admin Role
    console.log("Creating Master Admin role...");
    const masterRoleResult = await db
      .insert(adminRoles)
      .values({
        name: "Master Admin",
        description: "Full access to all admin features",
        isMasterAdmin: true,
      });

    // Get the inserted role ID (MySQL returns insertId)
    const [masterRole] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.name, "Master Admin"))
      .limit(1);

    console.log(`✅ Master Admin role created (ID: ${masterRole.id})`);

    // 2. Create Operation Role
    console.log("Creating Operation role...");
    await db
      .insert(adminRoles)
      .values({
        name: "Operation",
        description: "Operations team with most permissions except admin management",
        isMasterAdmin: false,
      });

    const [operationRole] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.name, "Operation"))
      .limit(1);

    // Add permissions for Operation role
    const operationPermissions = [
      "user.list",
      "user.view",
      "user.bulk_import",
      "user.modify_address",
      "nft.create",
      "nft.update",
      "nft.mint",
      "news.create",
      "news.update",
      "news.multilingual",
      "class.create",
      "class.update",
      "class.manage_meetings",
      "merchant.create",
      "merchant.update",
      "merchant_ads.create",
      "merchant_ads.update",
      "logs.view",
      "dashboard.view",
    ];

    for (const permission of operationPermissions) {
      await db.insert(adminPermissions).values({
        roleId: operationRole.id,
        permission,
      });
    }

    console.log(`✅ Operation role created (ID: ${operationRole.id})`);

    // 3. Create Support Role
    console.log("Creating Support role...");
    await db
      .insert(adminRoles)
      .values({
        name: "Support",
        description: "Customer support team with view and limited edit permissions",
        isMasterAdmin: false,
      });

    const [supportRole] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.name, "Support"))
      .limit(1);

    // Add permissions for Support role
    const supportPermissions = [
      "user.list",
      "user.view",
      "user.modify_address",
      "logs.view",
      "dashboard.view",
    ];

    for (const permission of supportPermissions) {
      await db.insert(adminPermissions).values({
        roleId: supportRole.id,
        permission,
      });
    }

    console.log(`✅ Support role created (ID: ${supportRole.id})`);

    // 4. Create Master Admin User
    console.log("Creating Master Admin user...");
    const passwordHash = await bcrypt.hash("admin123", 10);

    await db.insert(admins).values({
      email: "admin@beehive.io",
      passwordHash,
      name: "Master Administrator",
      roleId: masterRole.id,
      active: true,
    });

    console.log("✅ Master Admin user created");
    console.log("   Email: admin@beehive.io");
    console.log("   Password: admin123");
    console.log("   ⚠️  PLEASE CHANGE THIS PASSWORD IN PRODUCTION!");

    // 5. Create Operation Admin User
    console.log("Creating Operation admin user...");
    const operationPasswordHash = await bcrypt.hash("operation123", 10);

    await db.insert(admins).values({
      email: "operation@beehive.io",
      passwordHash: operationPasswordHash,
      name: "Operation Admin",
      roleId: operationRole.id,
      active: true,
    });

    console.log("✅ Operation admin user created");
    console.log("   Email: operation@beehive.io");
    console.log("   Password: operation123");

    console.log("\n🎉 Seeding completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - 3 roles created (Master Admin, Operation, Support)");
    console.log("   - 2 admin users created");
    console.log("   - Permissions assigned to roles");
    console.log("\n🔐 Login Credentials:");
    console.log("   Master Admin: admin@beehive.io / admin123");
    console.log("   Operation: operation@beehive.io / operation123");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Run seed
seed()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

