# Referral Code Generation and BCC Rewards Script

## Overview
This script generates unique referral codes for all members who don't have one, and awards BCC rewards based on their membership level.

## What the Script Does

1. **Finds all members without referral codes** from the `members` table
2. **Generates unique referral codes** (8 random lowercase alphanumeric characters)
3. **Generates member IDs** (format: `BH-000001`)
4. **Awards BCC rewards** based on each member's `currentLevel` from the `members` table
5. **Updates the database** with referral codes and member IDs

## Database Tables Used

### 1. `members` Table
- **Purpose**: Primary table for member data and referral codes
- **Fields Updated**:
  - `memberId`: Generated member ID (e.g., `BH-000001`)
  - `referralCode`: 8-character random alphanumeric code (e.g., `a3b7c9d2`)
- **Fields Read**:
  - `id`: Member ID
  - `walletAddress`: Member's wallet address
  - `currentLevel`: Member's membership level (used to determine BCC reward)

### 2. `rewards` Table ⭐ **BCC REWARDS ARE INSERTED HERE**
- **Purpose**: Stores all reward records including BCC tokens
- **Fields Inserted**:
  - `recipientWallet`: Member's wallet address (from `members.walletAddress`)
  - `sourceWallet`: `null` (no source wallet for initial reward)
  - `rewardType`: `"bcc_token"`
  - `amount`: BCC amount based on membership level (from `MEMBERSHIP_LEVELS`)
  - `currency`: `"BCC"`
  - `status`: `"instant"` (BCC rewards are instant)
  - `notes`: `"BCC reward for Level {level} membership (referral code generation)"`
  - `createdAt`: Timestamp of when reward was created

## BCC Reward Amounts by Level

Based on `MEMBERSHIP_LEVELS` configuration:

| Level | Name | BCC Reward |
|-------|------|------------|
| 1 | Warrior | 500 BCC |
| 2 | Bronze | 100 BCC |
| 3 | Silver | 200 BCC |
| 4 | Gold | 300 BCC |
| 5 | Elite | 400 BCC |
| 6 | Platinum | 500 BCC |
| 7 | Master | 600 BCC |
| 8 | Diamond | 700 BCC |
| 9 | Grandmaster | 800 BCC |
| 10 | Starlight | 900 BCC |
| 11 | Epic | 1000 BCC |
| 12 | Legend | 1100 BCC |
| 13 | Supreme King | 1200 BCC |
| 14 | Peerless King | 1300 BCC |
| 15 | Glory King | 1400 BCC |
| 16 | Legendary | 1500 BCC |
| 17 | Supreme | 1600 BCC |
| 18 | Mythic | 900 BCC |
| 19 | Mythic Apex | 1950 BCC |

## Duplicate Prevention

The script checks for existing BCC rewards to prevent duplicates:
- Checks if a reward with notes containing "referral code generation" already exists
- If found, skips awarding the reward
- This allows the script to be run multiple times safely

## Usage

```bash
pnpm --filter @beehive/api db:generate-referral-codes
```

## Example Output

```
Starting referral code generation for all members...

Found 5 members without referral codes
✓ Member 1 (0xabc123...): a3b7c9d2
  → Awarded BCC reward for Level 1
✓ Member 2 (0xdef456...): x9y2z8w1
  → Awarded BCC reward for Level 3
✓ Member 3 (0xghi789...): m4n5p6q7
  → BCC reward from referral code generation already exists, skipping
✓ Member 4 (0xjkl012...): r8s9t0u1
  → No level set (level: 0), skipping BCC reward

Processed 4 users successfully

✓ Referral code generation completed!
```

## Important Notes

1. **Rewards Table**: All BCC rewards are inserted into the `rewards` table, not the `members` table
2. **Level Required**: Members with `currentLevel = 0` or `null` will not receive BCC rewards
3. **No Duplicates**: The script checks for existing rewards to prevent duplicate awards
4. **Referral Code Format**: 8 random lowercase alphanumeric characters (a-z, 0-9)
5. **Member ID Format**: `BH-{id padded to 6 digits}` (e.g., `BH-000001`)

## Related Files

- **Script**: `apps/api/src/scripts/generateReferralCodes.ts`
- **BCC Rewards Utility**: `apps/api/src/utils/bccRewards.ts`
- **Referral Code Utility**: `apps/api/src/utils/referralCode.ts`
- **Schema**: `apps/api/src/db/schema.ts`

