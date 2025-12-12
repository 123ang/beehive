# Withdrawal System for USDT and BCC

## Overview
This document explains how withdrawals are handled for both USDT and BCC currencies. The system uses the existing `transactions` table (updated) to track all withdrawal transactions.

## Database Design

### Updated `transactions` Table
The `transactions` table has been updated to support withdrawals:

**New Fields**:
- `transactionType`: Type of transaction (`"purchase"`, `"withdrawal"`, `"deposit"`)
- `currency`: Currency type (`"USDT"` or `"BCC"`)
- `notes`: Optional notes for the transaction
- `level`: Now nullable (withdrawals don't have a level)

**Existing Fields**:
- `walletAddress`: User's wallet address
- `txHash`: Blockchain transaction hash (when confirmed)
- `amount`: Withdrawal amount
- `status`: Transaction status (`"pending"`, `"confirmed"`, `"failed"`)
- `blockNumber`: Block number when confirmed
- `createdAt`: When withdrawal was requested
- `confirmedAt`: When blockchain transaction was confirmed

## How It Works

### Balance Tracking

1. **Rewards Given** → Balance **INCREASES**
   - When `awardBCCReward()` is called:
     - Inserts record into `rewards` table (historical)
     - Updates `members.bccBalance` (increases balance)

2. **Withdrawal Requested** → Balance **DECREASES**
   - When `processWithdrawal()` is called:
     - Checks if sufficient balance
     - Creates transaction record in `transactions` table
     - Updates `members.bccBalance` (decreases balance immediately)
     - Status is set to `"pending"` until blockchain confirms

3. **Withdrawal Confirmed** → Transaction Updated
   - When blockchain transaction is confirmed:
     - `confirmWithdrawal()` updates transaction with `txHash` and `blockNumber`
     - Status changes from `"pending"` to `"confirmed"`

## Usage

### Process a Withdrawal

```typescript
import { processWithdrawal } from "../utils/withdrawals";

const result = await processWithdrawal({
  walletAddress: "0xabc123...",
  currency: "BCC",
  amount: 100,
  notes: "User withdrawal request"
});

if (result.success) {
  console.log(`Withdrawal transaction ID: ${result.transactionId}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

### Confirm a Withdrawal (After Blockchain Confirmation)

```typescript
import { confirmWithdrawal } from "../utils/withdrawals";

const result = await confirmWithdrawal(
  transactionId,
  "0xtxhash...",
  12345678 // blockNumber
);
```

### Get Withdrawal History

```typescript
import { getWithdrawalHistory } from "../utils/withdrawals";

// Get all withdrawals
const allWithdrawals = await getWithdrawalHistory("0xabc123...");

// Get only BCC withdrawals
const bccWithdrawals = await getWithdrawalHistory("0xabc123...", "BCC");
```

## Balance Flow

### BCC Balance:
1. **Reward Given**: `members.bccBalance` increases
2. **Withdrawal Requested**: `members.bccBalance` decreases (immediately)
3. **Withdrawal Confirmed**: Transaction status updated (balance already decreased)

### USDT Balance:
- Currently, USDT balance tracking needs to be implemented
- You may want to add `usdtBalance` field to `members` table
- Or calculate from `rewards` table where `currency = "USDT"` and `status = "instant"`

## Migration

Run the migration to update the transactions table:

```sql
-- Add transaction_type column
ALTER TABLE `transactions` 
ADD COLUMN IF NOT EXISTS `transaction_type` VARCHAR(20) NOT NULL DEFAULT 'purchase' AFTER `tx_hash`;

-- Add currency column
ALTER TABLE `transactions` 
ADD COLUMN IF NOT EXISTS `currency` VARCHAR(10) NOT NULL DEFAULT 'USDT' AFTER `transaction_type`;

-- Make level nullable
ALTER TABLE `transactions` 
MODIFY COLUMN `level` INT NULL;

-- Add notes column
ALTER TABLE `transactions` 
ADD COLUMN IF NOT EXISTS `notes` TEXT NULL AFTER `status`;

-- Create indexes
CREATE INDEX IF NOT EXISTS `transactions_type_idx` ON `transactions`(`transaction_type`);
CREATE INDEX IF NOT EXISTS `transactions_currency_idx` ON `transactions`(`currency`);
```

## Important Notes

1. **Balance Decreases Immediately**: When a withdrawal is requested, the balance is decreased immediately (not waiting for blockchain confirmation). This prevents double-spending.

2. **Transaction Status**: 
   - `pending`: Withdrawal requested, waiting for blockchain confirmation
   - `confirmed`: Blockchain transaction confirmed
   - `failed`: Transaction failed (balance should be restored)

3. **USDT Support**: The withdrawal system supports USDT, but you'll need to:
   - Add `usdtBalance` field to `members` table, OR
   - Calculate USDT balance from `rewards` table
   - Update `processWithdrawal()` to handle USDT balance checks

4. **Failed Transactions**: If a withdrawal fails on the blockchain, you should:
   - Update transaction status to `"failed"`
   - Restore the balance in `members` table

## Files

- **Schema**: `apps/api/src/db/schema.ts` (updated transactions table)
- **Withdrawal Utility**: `apps/api/src/utils/withdrawals.ts`
- **Migration**: `apps/api/src/scripts/migrations/update-transactions-for-withdrawals.sql`

