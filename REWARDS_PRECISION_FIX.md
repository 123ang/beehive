# Rewards Precision Fix

## Problem
All rewards were showing as `0.999999999999999999` for all accounts.

## Root Cause
The `rewards.amount` field was defined as `DECIMAL(18,18)`, which means:
- **18 total digits**
- **18 digits after the decimal point**
- **0 digits before the decimal point**

This means it can only store values between `0` and `0.999999999999999999`.

When storing amounts like:
- `100` USDT → Gets truncated to `0.999999999999999999`
- `50` USDT → Gets truncated to `0.999999999999999999`
- `1950` BCC → Gets truncated to `0.999999999999999999`

## Solution
Changed `rewards.amount` from `DECIMAL(18,18)` to `DECIMAL(36,18)`:
- **36 total digits**
- **18 digits after the decimal point**
- **18 digits before the decimal point**

This allows storing values up to `999999999999999999.999999999999999999` (18 digits before, 18 after).

## Migration

Run the migration script:
```sql
-- See: apps/api/src/scripts/migrations/fix-rewards-amount-precision.sql
ALTER TABLE `rewards` 
MODIFY COLUMN `amount` DECIMAL(36, 18) NOT NULL;
```

## Impact

### Before Fix:
- 100 USDT reward → Stored as `0.999999999999999999`
- 50 USDT reward → Stored as `0.999999999999999999`
- 1950 BCC reward → Stored as `0.999999999999999999`

### After Fix:
- 100 USDT reward → Stored as `100.000000000000000000`
- 50 USDT reward → Stored as `50.000000000000000000`
- 1950 BCC reward → Stored as `1950.000000000000000000`

## Files Changed

1. **Schema**: `apps/api/src/db/schema.ts`
   - Changed `rewards.amount` from `DECIMAL(18,18)` to `DECIMAL(36,18)`

2. **Migration**: `apps/api/src/scripts/migrations/fix-rewards-amount-precision.sql`
   - SQL script to update the database column

## Next Steps

1. **Run the migration** to update existing database
2. **Re-run reward scripts** if needed to fix existing reward records
3. **Verify** that rewards are now displaying correctly

## Note

The `transactions.amount` field remains as `DECIMAL(18,6)` which is appropriate for transaction amounts that don't need 18 decimal precision.

