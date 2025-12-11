import { executeQuery } from './database/connection';
import { config } from 'dotenv';
import { TreeImporter } from './importCSV';
import path from 'path';
import fs from 'fs';

// Load environment variables
config();

async function dropAndReimport() {
  console.log('='.repeat(80));
  console.log('Dropping and Reimporting Member Data');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Drop tables in correct order (due to foreign key constraints)
    console.log('🗑️  Dropping tables...');
    
    // Disable foreign key checks temporarily
    await executeQuery('SET FOREIGN_KEY_CHECKS = 0', []);
    
    // Drop tables
    try {
      await executeQuery('DROP TABLE IF EXISTS placements', []);
      console.log('   ✓ Dropped placements table');
    } catch (error) {
      console.warn('   ⚠️  Error dropping placements:', error);
    }
    
    try {
      await executeQuery('DROP TABLE IF EXISTS member_closure', []);
      console.log('   ✓ Dropped member_closure table');
    } catch (error) {
      console.warn('   ⚠️  Error dropping member_closure:', error);
    }
    
    try {
      await executeQuery('DROP TABLE IF EXISTS members', []);
      console.log('   ✓ Dropped members table');
    } catch (error) {
      console.warn('   ⚠️  Error dropping members:', error);
    }
    
    // Re-enable foreign key checks
    await executeQuery('SET FOREIGN_KEY_CHECKS = 1', []);
    
    console.log();
    
    // Step 2: Recreate tables using schema from migration
    console.log('🏗️  Recreating tables...');
    
    // Create members table
    await executeQuery(`
      CREATE TABLE \`members\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`wallet_address\` varchar(42) NOT NULL,
        \`username\` varchar(80),
        \`root_id\` int,
        \`sponsor_id\` int,
        \`current_level\` int DEFAULT 0,
        \`total_inflow\` decimal(18,6) DEFAULT '0',
        \`total_outflow_usdt\` decimal(18,6) DEFAULT '0',
        \`total_outflow_bcc\` int DEFAULT 0,
        \`direct_sponsor_count\` int DEFAULT 0,
        \`joined_at\` timestamp DEFAULT (now()),
        \`activation_sequence\` int DEFAULT 0,
        \`total_nft_claimed\` int,
        CONSTRAINT \`members_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`members_wallet_address_unique\` UNIQUE(\`wallet_address\`),
        CONSTRAINT \`members_wallet_idx\` UNIQUE(\`wallet_address\`)
      )
    `, []);
    console.log('   ✓ Created members table');
    
    // Add foreign key constraints for members
    try {
      await executeQuery(`
        ALTER TABLE \`members\` 
        ADD CONSTRAINT \`members_root_id_fk\` FOREIGN KEY (\`root_id\`) REFERENCES \`members\`(\`id\`) ON DELETE SET NULL
      `, []);
    } catch (error) {
      // Foreign key might already exist or fail due to circular reference
      console.warn('   ⚠️  Could not add root_id foreign key (this is OK if it already exists)');
    }
    
    try {
      await executeQuery(`
        ALTER TABLE \`members\` 
        ADD CONSTRAINT \`members_sponsor_id_fk\` FOREIGN KEY (\`sponsor_id\`) REFERENCES \`members\`(\`id\`) ON DELETE SET NULL
      `, []);
    } catch (error) {
      console.warn('   ⚠️  Could not add sponsor_id foreign key (this is OK if it already exists)');
    }
    
    // Create member_closure table
    await executeQuery(`
      CREATE TABLE \`member_closure\` (
        \`ancestor_id\` bigint NOT NULL,
        \`descendant_id\` bigint NOT NULL,
        \`depth\` int NOT NULL,
        CONSTRAINT \`member_closure_ancestor_id_descendant_id_pk\` PRIMARY KEY(\`ancestor_id\`,\`descendant_id\`),
        INDEX \`closure_descendant_idx\` (\`descendant_id\`),
        INDEX \`closure_depth_idx\` (\`ancestor_id\`, \`depth\`)
      )
    `, []);
    console.log('   ✓ Created member_closure table');
    
    // Create placements table
    await executeQuery(`
      CREATE TABLE \`placements\` (
        \`parent_id\` bigint NOT NULL,
        \`child_id\` bigint NOT NULL,
        \`position\` tinyint NOT NULL,
        \`created_at\` timestamp DEFAULT (now()),
        CONSTRAINT \`placements_child_id\` PRIMARY KEY(\`child_id\`),
        INDEX \`placements_parent_idx\` (\`parent_id\`),
        INDEX \`placements_parent_pos_idx\` (\`parent_id\`, \`position\`)
      )
    `, []);
    console.log('   ✓ Created placements table');
    
    // Add foreign key constraints for placements
    try {
      await executeQuery(`
        ALTER TABLE \`placements\` 
        ADD CONSTRAINT \`placements_parent_id_fk\` FOREIGN KEY (\`parent_id\`) REFERENCES \`members\`(\`id\`) ON DELETE CASCADE
      `, []);
    } catch (error) {
      console.warn('   ⚠️  Could not add placements parent_id foreign key');
    }
    
    try {
      await executeQuery(`
        ALTER TABLE \`placements\` 
        ADD CONSTRAINT \`placements_child_id_fk\` FOREIGN KEY (\`child_id\`) REFERENCES \`members\`(\`id\`) ON DELETE CASCADE
      `, []);
    } catch (error) {
      console.warn('   ⚠️  Could not add placements child_id foreign key');
    }
    
    console.log();
    console.log('✅ Tables recreated successfully!');
    console.log();
    
    // Step 3: Import CSV data
    console.log('📥 Importing data from members_update.csv...');
    console.log();
    
    const csvPath = path.resolve(process.cwd(), 'members_update.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    
    const importer = new TreeImporter();
    await importer.importCSV(csvPath);
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ Drop and Reimport Completed Successfully!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error during drop and reimport:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  dropAndReimport().catch(console.error);
}

