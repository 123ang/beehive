# BCC Rewards Script

## Overview
This is a separate script dedicated to awarding BCC rewards to all members based on their membership level. It is independent from the referral code generation script.

## Script Location
`apps/api/src/scripts/awardBCCRewardsByLevel.ts`

## Usage

```bash
pnpm --filter @beehive/api db:award-bcc-rewards
```

## What the Script Does

1. **Finds all members** with a membership level > 0 from the `members` table
2. **Checks for existing BCC rewards** to prevent duplicates
3. **Awards BCC rewards** based on each member's `currentLevel`
4. **Inserts rewards** into the `rewards` table

## Database Tables Used

### 1. `members` Table (Read)
- **Fields Read**:
  - `id`: Member ID
  - `walletAddress`: Member's wallet address
  - `currentLevel`: Member's membership level (used to determine BCC reward)

### 2. `rewards` Table ⭐ **BCC REWARDS ARE INSERTED HERE**
- **Fields Inserted**:
  - `recipientWallet`: Member's wallet address (from `members.walletAddress`)
  - `sourceWallet`: `null` (no source wallet for level-based reward)
  - `rewardType`: `"bcc_token"`
  - `amount`: BCC amount based on membership level (from `MEMBERSHIP_LEVELS`)
  - `currency`: `"BCC"`
  - `status`: `"instant"` (BCC rewards are instant)
  - `notes`: `"BCC reward for Level {level} membership"`
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
- Checks if a reward with notes containing "Level {level} membership" already exists
- If found, skips awarding the reward
- This allows the script to be run multiple times safely

## Example Output

```
Starting BCC reward distribution for all members...

Found 5 members with membership levels
✓ Member 1 (0xabc123...): Awarded BCC reward for Level 1
✓ Member 2 (0xdef456...): Awarded BCC reward for Level 3
⊘ Member 3 (0xghi789...): BCC reward for Level 2 already exists, skipping
✓ Member 4 (0xjkl012...): Awarded BCC reward for Level 5

Processed 4 members:
  ✓ Successfully awarded: 3
  ⊘ Skipped (already exists): 1

✓ BCC reward distribution completed!
```

## Important Notes

1. **Rewards Table**: All BCC rewards are inserted into the `rewards` table, not the `members` table
2. **Level Required**: Members with `currentLevel = 0` or `null` will be skipped
3. **No Duplicates**: The script checks for existing rewards to prevent duplicate awards
4. **Separate Script**: This script is completely separate from the referral code generation script

## Related Files

- **Script**: `apps/api/src/scripts/awardBCCRewardsByLevel.ts`
- **BCC Rewards Utility**: `apps/api/src/utils/bccRewards.ts`
- **Schema**: `apps/api/src/db/schema.ts`
- **Referral Code Script**: `apps/api/src/scripts/generateReferralCodes.ts` (separate, no BCC rewards)

