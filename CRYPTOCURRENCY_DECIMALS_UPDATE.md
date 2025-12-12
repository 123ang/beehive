# Cryptocurrency Decimals Update: 6 to 18

## Overview
All cryptocurrency-related decimal fields have been updated from `DECIMAL(18,6)` to `DECIMAL(18,18)` to match the standard ERC-20 token decimal precision (18 decimals).

## Why 18 Decimals?

ERC-20 tokens (including USDT and BCC) typically use 18 decimal places:
- **USDT (Tether)**: Uses 6 decimals on some chains, but 18 is standard for most ERC-20 tokens
- **BCC (Beehive Coin)**: Uses 18 decimals (as defined in the contract)

Using 18 decimals provides:
- Better precision for calculations
- Consistency with blockchain standards
- Support for very small fractional amounts

## Updated Fields

### 1. `users` Table
- `total_spent`: DECIMAL(18,6) → DECIMAL(18,18)
- `total_rewards`: DECIMAL(18,6) → DECIMAL(18,18)
- `referral_rewards_earned`: DECIMAL(18,6) → DECIMAL(18,18)

### 2. `members` Table
- `total_inflow`: DECIMAL(18,6) → DECIMAL(18,18)
- `total_outflow_usdt`: DECIMAL(18,6) → DECIMAL(18,18)
- `total_outflow_bcc`: INT → DECIMAL(18,18) ⚠️ **Type changed from INT to DECIMAL**
- `bcc_balance`: DECIMAL(18,6) → DECIMAL(18,18)

### 3. `rewards` Table
- `amount`: DECIMAL(18,6) → DECIMAL(18,18)

### 4. `transactions` Table
- `amount`: DECIMAL(18,6) → DECIMAL(18,18)

### 5. `levels` Table
- `price_usdt`: DECIMAL(18,6) → DECIMAL(18,18)
- `bcc_reward`: INT → DECIMAL(18,18) ⚠️ **Type changed from INT to DECIMAL**

### 6. `nft_collections` Table
- `bcc_reward`: DECIMAL(18,6) → DECIMAL(18,18)

### 7. `dashboard_metrics` Table
- `metric_value`: DECIMAL(18,6) → DECIMAL(18,18)

## Migration

Run the migration script to update your database:

```sql
-- See: apps/api/src/scripts/migrations/update-cryptocurrency-decimals-to-18.sql
```

**Important Notes**:
1. **Data Conversion**: Existing data will be automatically converted, but make sure to backup your database first
2. **Type Changes**: 
   - `members.total_outflow_bcc`: Changed from INT to DECIMAL(18,18)
   - `levels.bcc_reward`: Changed from INT to DECIMAL(18,18)
3. **Default Values**: All defaults remain "0" but now with 18 decimal places

## Code Updates

The schema file (`apps/api/src/db/schema.ts`) has been updated to reflect these changes. All TypeScript types will automatically use the new precision.

## Testing

After migration:
1. Verify existing data is preserved correctly
2. Test reward calculations with 18 decimal precision
3. Ensure withdrawal calculations work correctly
4. Check that balance displays show proper decimal places

## Files Updated

- **Schema**: `apps/api/src/db/schema.ts`
- **Migration**: `apps/api/src/scripts/migrations/update-cryptocurrency-decimals-to-18.sql`

