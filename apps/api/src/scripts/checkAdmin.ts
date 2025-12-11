#!/usr/bin/env tsx
/**
 * Check if admin users exist
 */

import { db, admins } from "../db/index.js";

async function checkAdmin() {
  try {
    const adminList = await db.select().from(admins).limit(5);
    
    if (adminList.length === 0) {
      console.log("❌ No admin users found!");
      console.log("\nPlease run: pnpm db:seed");
      console.log("\nThis will create a default admin:");
      console.log("  Email: admin@beehive.io");
      console.log("  Password: admin123");
    } else {
      console.log(`✓ Found ${adminList.length} admin user(s):\n`);
      adminList.forEach((admin, i) => {
        console.log(`${i + 1}. ${admin.email} (Active: ${admin.active})`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkAdmin();

