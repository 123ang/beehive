# Direct Referrals Count Fix

## Problem

The user `0xeF76A7b542bE825cf54d5822Ee7DAdfF8Cf11Af2` has 3 direct sponsors in the database, but the dashboard showed 0 direct referrals.

## Root Cause

The `directSponsorCount` field in the `members` table is only incremented when:
1. A new member registers through the reward service
2. Direct sponsor rewards are processed

For **bulk-imported members** from CSV:
- The `directSponsorCount` field defaults to 0
- It's never updated during the import process
- The field doesn't reflect the actual count of direct referrals

## Solution

Changed the API to calculate the **actual count** of direct referrals by querying the database instead of relying on the `directSponsorCount` field.

### Changes Made:

#### 1. Dashboard Endpoint (`/api/members/dashboard`)
**Before:**
```typescript
directReferrals: member.directSponsorCount,
```

**After:**
```typescript
// Get actual direct referrals count (members who have this member as sponsor)
const directReferralsResult = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(members)
  .where(eq(members.sponsorId, member.id));
const actualDirectReferrals = directReferralsResult[0]?.count || 0;

directReferrals: actualDirectReferrals,
```

#### 2. Referral Endpoint (`/api/members/referral`)
**Before:**
```typescript
directReferralCount: member.directSponsorCount,
```

**After:**
```typescript
directReferralCount: directReferrals.length,
```

## Matrix Viewer Improvements

Also removed the layout selector and kept only **Dagre (Tree)** layout:
- Removed `layout` state variable
- Removed layout selector dropdown
- Hardcoded layout to "dagre" for consistent tree visualization
- Simplified the component

## Benefits

1. **Accurate Counts**: Shows the real number of direct referrals from the database
2. **Works for All Members**: Both bulk-imported and newly registered members
3. **Real-time**: Always reflects current state of the database
4. **No Migration Needed**: Doesn't require updating existing data

## Technical Details

### Query Used:
```sql
SELECT COUNT(*) 
FROM members 
WHERE sponsor_id = ?
```

This counts all members who have the current member as their sponsor.

### Why Not Fix the Field?

We could update the `directSponsorCount` field for all existing members, but:
- The dynamic query is more reliable
- No risk of the field getting out of sync
- Works immediately without data migration
- Minimal performance impact (indexed query)

## Testing

To verify the fix:
1. Connect wallet for a member with direct referrals
2. Check the dashboard - should show correct count
3. Check the referral page - should match
4. Verify in admin matrix viewer - statistics should be accurate

## Future Considerations

If performance becomes an issue with large datasets:
1. Add a database trigger to maintain `directSponsorCount`
2. Run a periodic job to sync the counts
3. Use materialized views for statistics

For now, the dynamic query approach is the most reliable and maintainable solution.

