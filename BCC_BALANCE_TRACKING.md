# BCC Balance Tracking System

## Overview
This document explains how BCC rewards are tracked and where the balance is stored in the database.

## Database Tables

### 1. `rewards` Table ⭐ **REWARDS ARE RECORDED HERE**
**Purpose**: Stores all reward transactions (historical record)

**Fields**:
- `id`: Primary key
- `recipientWallet`: Wallet address receiving the reward
- `sourceWallet`: Optional source wallet
- `rewardType`: Type of reward (`"bcc_token"`, `"direct_sponsor"`, `"layer_payout"`)
- `amount`: Reward amount (DECIMAL 18,6)
- `currency`: Currency type (`"BCC"` or `"USDT"`)
- `status`: Reward status (`"instant"`, `"pending"`, `"claimed"`, `"expired"`)
- `notes`: Description of the reward
- `createdAt`: When the reward was created
- `claimedAt`: When the reward was claimed (if applicable)

**Usage**: This is the **source of truth** for all reward transactions. Every BCC reward given by the system is recorded here.

### 2. `members` Table ⭐ **BCC BALANCE IS TRACKED HERE**
**Purpose**: Stores current BCC balance for each member

**Fields**:
- `id`: Primary key
- `walletAddress`: Member's wallet address
- `bccBalance`: **Current BCC balance** (DECIMAL 18,6) - **NEW FIELD**
- `currentLevel`: Member's membership level
- Other member fields...

**Usage**: This field tracks the **current available BCC balance** in the user's wallet. It's updated automatically when rewards are awarded.

## How It Works

### When a BCC Reward is Awarded:

1. **Insert into `rewards` table**:
   - Creates a record of the reward transaction
   - Stores: amount, recipient, type, status, notes, etc.
   - This is the **historical record**

2. **Update `members.bccBalance`**:
   - Finds the member by wallet address
   - Adds the reward amount to their current balance
   - Updates the `bccBalance` field
   - This is the **current balance**

### Example Flow:

```typescript
// User receives 500 BCC for Level 1 membership

// Step 1: Insert into rewards table
rewards table:
{
  recipientWallet: "0xabc123...",
  amount: "500",
  currency: "BCC",
  rewardType: "bcc_token",
  status: "instant",
  notes: "BCC reward for Level 1 membership"
}

// Step 2: Update members table
members table:
{
  walletAddress: "0xabc123...",
  bccBalance: "500"  // Updated from 0 to 500
}
```

## Migration

To add the `bcc_balance` column to existing databases:

```sql
-- Add bcc_balance column
ALTER TABLE `members` 
ADD COLUMN IF NOT EXISTS `bcc_balance` DECIMAL(18, 6) DEFAULT 0 AFTER `total_outflow_bcc`;

-- Initialize balance for existing members based on their rewards
UPDATE `members` m
SET `bcc_balance` = (
  SELECT COALESCE(SUM(CAST(r.amount AS DECIMAL(18, 6))), 0)
  FROM `rewards` r
  WHERE r.recipient_wallet = m.wallet_address
    AND r.currency = 'BCC'
    AND r.reward_type = 'bcc_token'
    AND r.status = 'instant'
);
```

## Functions

### `awardBCCReward(walletAddress, level, sourceWallet?, notes?)`
**Location**: `apps/api/src/utils/bccRewards.ts`

**What it does**:
1. Calculates BCC amount based on membership level
2. Inserts reward record into `rewards` table
3. Updates `members.bccBalance` by adding the reward amount

**Both tables are updated automatically** when this function is called.

## Querying BCC Balance

### Get Current Balance:
```typescript
const member = await db.query.members.findFirst({
  where: eq(members.walletAddress, walletAddress),
});

const currentBalance = member?.bccBalance || "0";
```

### Get All Rewards (Historical):
```typescript
const allRewards = await db
  .select()
  .from(rewards)
  .where(
    and(
      eq(rewards.recipientWallet, walletAddress),
      eq(rewards.currency, "BCC")
    )
  );
```

## Important Notes

1. **Two Tables, Two Purposes**:
   - `rewards` table = Historical record of all transactions
   - `members.bccBalance` = Current available balance

2. **Automatic Updates**: The `awardBCCReward()` function updates both tables automatically

3. **Balance Calculation**: The balance is calculated by summing all BCC rewards from the `rewards` table, but stored in `members.bccBalance` for quick access

4. **When Balance Changes**: 
   - **Increases**: When rewards are awarded (via `awardBCCReward()`)
   - **Decreases**: When user withdraws/spends BCC (you'll need to update this manually or create a withdrawal function)

5. **Data Integrity**: The `rewards` table is the source of truth. If there's a discrepancy, you can recalculate the balance from the rewards table.

## Withdrawal/Spending

When a user withdraws or spends BCC, you should:
1. Update `members.bccBalance` (subtract the amount)
2. Optionally create a record in `rewards` or a separate `transactions` table

Example:
```typescript
// User withdraws 100 BCC
const currentBalance = parseFloat(member.bccBalance || "0");
const newBalance = (currentBalance - 100).toString();

await db
  .update(members)
  .set({ bccBalance: newBalance })
  .where(eq(members.walletAddress, walletAddress));
```

