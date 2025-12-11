#!/usr/bin/env tsx
/**
 * Quick script to check if members exist in database
 */

import { db, members } from "../db/index.js";
import { config } from "dotenv";

config({ path: "../../.env" });

async function checkMembers() {
  try {
    const allMembers = await db.select().from(members).limit(5);
    console.log(`Found ${allMembers.length} members in database`);
    if (allMembers.length > 0) {
      console.log("\nSample members:");
      allMembers.forEach((m, i) => {
        console.log(`${i + 1}. ${m.walletAddress} - Level ${m.currentLevel}`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkMembers();

