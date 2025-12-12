# Referral Code Migration from Users to Members Table

## Overview
This document describes the migration of referral code functionality from the `users` table to the `members` table, as the members table is the primary table for the matrix/tree structure.

## Changes Made

### 1. Database Schema Updates
**File**: `apps/api/src/db/schema.ts`

- Added `memberId` and `referralCode` columns to the `members` table
- Added unique indexes for `referralCode` and `memberId` in the members table

**Migration SQL**: `apps/api/src/scripts/migrations/add-referral-code-to-members.sql`
- Run this migration to add the columns to your database

### 2. Referral Code Generation Script
**File**: `apps/api/src/scripts/generateReferralCodes.ts`

**Changes**:
- Switched from `users` table to `members` table
- Now generates referral codes for all members without codes
- Uses `members` table for collision detection

**Usage**:
```bash
pnpm --filter @beehive/api db:generate-referral-codes
```

### 3. Referral Routes
**File**: `apps/api/src/routes/referral.ts`

#### POST `/api/referral/generate`
- Now queries `members` table instead of `users` table
- Generates referral code for members
- Returns member's referral code and member ID

#### GET `/api/referral/validate/:code`
- Validates referral code against `members` table
- Returns sponsor information from members table

#### POST `/api/referral/register`
- Validates referral code from `members` table
- Creates new member using `createMemberWithPlacement()` utility
- Generates referral code for new member
- Still creates/updates user record for authentication purposes
- Awards BCC rewards based on membership level

#### GET `/api/referral/my-referrals`
- Queries `members` table for member information
- Returns both referral relationships (from users table) and direct referrals (from members table)

### 4. Referral Code Format
- **Format**: 8 random lowercase alphanumeric characters
- **Example**: `a3b7c9d2`
- **Characters**: `a-z` and `0-9` (lowercase only)
- **Uniqueness**: Automatically checked with retry logic (up to 10 attempts)

## Database Migration

Run the migration SQL to add the columns:

```sql
-- Add member_id column if it doesn't exist
ALTER TABLE `members` 
ADD COLUMN IF NOT EXISTS `member_id` VARCHAR(50) NULL UNIQUE AFTER `direct_sponsor_count`;

-- Add referral_code column if it doesn't exist
ALTER TABLE `members` 
ADD COLUMN IF NOT EXISTS `referral_code` VARCHAR(50) NULL UNIQUE AFTER `member_id`;

-- Create indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS `members_referral_code_idx` ON `members`(`referral_code`);
CREATE UNIQUE INDEX IF NOT EXISTS `members_member_id_idx` ON `members`(`member_id`);
```

## Key Points

1. **Members Table is Primary**: Referral codes are now stored in the `members` table, which is the primary table for the matrix/tree structure.

2. **Users Table Still Used**: The `users` table is still used for:
   - Authentication (SIWE)
   - User profile data (email, name, phone)
   - Referral relationships table (uses user IDs)

3. **Both Tables Linked**: Both tables are linked by `walletAddress`, so data can be synchronized between them.

4. **Registration Flow**:
   - Validates referral code from `members` table
   - Creates member in `members` table with matrix placement
   - Generates referral code for new member
   - Creates/updates user record for authentication
   - Awards BCC rewards

## Testing

After migration:
1. Run the migration SQL
2. Run the referral code generation script for existing members
3. Test registration with referral codes
4. Verify referral codes are generated correctly (8 lowercase alphanumeric characters)

