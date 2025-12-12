# Referral Code Generation and BCC Rewards Implementation

## Overview
This document describes the implementation of automatic referral code generation for all members and BCC rewards distribution based on membership level during registration.

## Referral Code Format
- **Format**: 8 random lowercase alphanumeric characters (e.g., `a3b7c9d2`)
- **Characters**: `a-z` and `0-9` (lowercase only)
- **Length**: Exactly 8 characters
- **Uniqueness**: Automatically checked to ensure no duplicates

## Changes Made

### 1. Referral Code Generation Script
**File**: `apps/api/src/scripts/generateReferralCodes.ts`

This script generates referral codes for all existing members who don't have one.

**Features**:
- Finds all users without referral codes
- Generates unique member IDs (format: `BH-000001`)
- Generates 8-character random alphanumeric referral codes (e.g., `a3b7c9d2`)
- Automatically retries if collision detected (up to 10 attempts)
- Updates the database with generated codes

**Usage**:
```bash
pnpm --filter @beehive/api db:generate-referral-codes
```

### 2. BCC Rewards Utility
**File**: `apps/api/src/utils/bccRewards.ts`

A utility function to award BCC tokens based on membership level.

**Function**: `awardBCCReward(walletAddress, level, sourceWallet?, notes?)`
- Awards BCC tokens based on the membership level configuration
- Creates a reward record in the `rewards` table
- Reward type: `bcc_token`
- Currency: `BCC`
- Status: `instant` (BCC rewards are immediately available)

**BCC Rewards by Level**:
- Level 1: 500 BCC
- Level 2: 100 BCC
- Level 3: 200 BCC
- Level 4: 300 BCC
- Level 5: 400 BCC
- Level 6: 500 BCC
- Level 7: 600 BCC
- Level 8: 700 BCC
- Level 9: 800 BCC
- Level 10: 900 BCC
- Level 11: 1,000 BCC
- Level 12: 1,100 BCC
- Level 13: 1,200 BCC
- Level 14: 1,300 BCC
- Level 15: 1,400 BCC
- Level 16: 1,500 BCC
- Level 17: 1,600 BCC
- Level 18: 900 BCC
- Level 19: 1,950 BCC

### 3. Updated Registration Endpoint
**File**: `apps/api/src/routes/referral.ts`

**Changes**:
1. **Automatic Referral Code Generation**: New users automatically get a referral code when they register
2. **Collision Handling**: Checks for duplicate referral codes and appends user ID if collision occurs
3. **BCC Rewards**: Automatically awards BCC tokens based on membership level (Level 1 = 500 BCC) during registration
4. **Database Storage**: BCC rewards are saved to the `rewards` table with:
   - `rewardType`: `bcc_token`
   - `currency`: `BCC`
   - `status`: `instant`
   - `amount`: Based on membership level

### 4. Updated Generate Referral Code Endpoint
**File**: `apps/api/src/routes/referral.ts` (POST `/api/referral/generate`)

**Changes**:
- Added collision detection for referral codes
- Handles cases where referral code already exists

## Database Schema

### Rewards Table
The BCC rewards are stored in the `rewards` table with the following structure:
- `recipientWallet`: User's wallet address
- `sourceWallet`: Optional source wallet (sponsor's address for registration rewards)
- `rewardType`: `bcc_token`
- `amount`: BCC amount (decimal, 18 precision, 6 scale)
- `currency`: `BCC`
- `status`: `instant` (immediately available)
- `notes`: Description of the reward

## Usage

### Generate Referral Codes for Existing Members
Run the script to generate referral codes for all existing members:
```bash
pnpm --filter @beehive/api db:generate-referral-codes
```

### New User Registration
When a new user registers via `/api/referral/register`:
1. User is created with Level 1 membership
2. Member ID is generated (format: `BH-000001`)
3. Referral code is generated (format: `BEEHIVE-BH-000001`)
4. **500 BCC tokens are automatically awarded** (Level 1 reward)
5. BCC reward is saved to the `rewards` table
6. User can immediately claim their BCC rewards

### Awarding BCC for Level Upgrades
To award BCC when a user upgrades their membership level, use:
```typescript
import { awardBCCReward } from "../utils/bccRewards";

await awardBCCReward(
  walletAddress,
  newLevel,
  sourceWallet, // Optional
  "Level upgrade BCC reward"
);
```

## Testing

1. **Test Referral Code Generation**:
   - Run the script: `pnpm --filter @beehive/api db:generate-referral-codes`
   - Verify all users have referral codes in the database

2. **Test Registration with BCC Rewards**:
   - Register a new user via `/api/referral/register`
   - Check that:
     - User has a referral code
     - BCC reward record exists in `rewards` table
     - Reward amount is 500 BCC (Level 1)
     - Reward status is `instant`

3. **Verify BCC Rewards in Database**:
   ```sql
   SELECT * FROM rewards 
   WHERE reward_type = 'bcc_token' 
   AND currency = 'BCC'
   ORDER BY created_at DESC;
   ```

## Notes

- Referral codes are unique and automatically generated
- BCC rewards are stored in the database and can be claimed by users
- The `awardBCCReward` function can be used anywhere in the codebase to award BCC tokens
- BCC rewards are marked as `instant` status, meaning they're immediately available for claiming

