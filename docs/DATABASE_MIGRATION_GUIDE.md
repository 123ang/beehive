# Database Migration Guide

## Current Situation

You have:
- ✅ 3,397 members imported with correct levels
- ✅ Database schema with `placements` and `member_closure` tables
- ❌ Members are NOT yet placed in the tree structure

## Migration Options

### Option 1: Build Tree for Existing Members (Recommended)

**This preserves all your existing data and just adds the tree structure.**

```bash
cd apps/api
pnpm db:build-tree
```

This script will:
1. Read `members.csv` to get referrer relationships
2. Process members in activation sequence order
3. Place each member in the tree using the Direct Sales Tree algorithm
4. Build the closure table for fast queries
5. Skip members that are already placed (safe to run multiple times)

**Advantages:**
- ✅ Preserves all existing data
- ✅ No data loss
- ✅ Can be run multiple times safely
- ✅ Builds tree based on actual referrer relationships from CSV

### Option 2: Drop and Recreate (NOT Recommended)

Only do this if you want to start completely fresh:

```bash
# 1. Drop database (in phpMyAdmin or MySQL)
DROP DATABASE beehive;
CREATE DATABASE beehive;

# 2. Push schema
cd apps/api
pnpm db:push

# 3. Seed admin users
pnpm db:seed

# 4. Import members with levels
pnpm db:update-levels

# 5. Build tree structure
pnpm db:build-tree
```

**Warning:** This will delete all your data!

## Recommended Steps

1. **First, ensure schema is up to date:**
   ```bash
   cd apps/api
   pnpm db:push
   ```
   This will create/update the `placements` and `member_closure` tables if they don't exist.

2. **Build tree structure for existing members:**
   ```bash
   pnpm db:build-tree
   ```
   This reads `members.csv` and builds the tree based on referrer relationships.

3. **Verify the tree:**
   ```bash
   pnpm tsx src/scripts/checkMembers.ts
   ```

## What the Tree Building Script Does

1. **Reads `members.csv`** to get:
   - Wallet addresses
   - Referrer relationships (`referrer_wallet`)
   - Activation sequence (for processing order)

2. **Identifies root member:**
   - Finds member with self-referrer (wallet = referrer_wallet)
   - Or uses first member as root

3. **Processes members in order:**
   - For each member, finds their sponsor
   - Uses Direct Sales Tree algorithm to find placement
   - Places member in tree
   - Updates closure table

4. **Handles edge cases:**
   - Missing referrers → uses root as sponsor
   - Already placed members → skips them
   - Errors → logs and continues

## After Migration

Once the tree is built, you can:

1. **View tree structure via API:**
   ```bash
   GET /api/members/tree?depth=2
   ```

2. **Query member relationships:**
   - Direct children
   - Team size
   - Layer counts
   - Sponsor information

## Troubleshooting

### If script fails partway through:
- The script is safe to re-run
- It skips members that are already placed
- Just run `pnpm db:build-tree` again

### If referrer relationships are missing:
- Members without valid referrers will be placed under the root member
- You can manually update referrer relationships later if needed

### If you need to rebuild from scratch:
- Drop `placements` and `member_closure` tables
- Run `pnpm db:build-tree` again

