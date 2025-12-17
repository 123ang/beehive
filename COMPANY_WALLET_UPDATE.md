# Company Wallet Address Update Guide

## Issue
You changed your company wallet address to `0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7`, but transactions are still going to the old address `0xba48b5b1f835ebfc5174c982405b3a7a11b655d0`.

## Solution
You need to update **BOTH** frontend and backend environment variables.

## Step 1: Update Backend Environment Variable

**File:** `apps/api/.env`

```env
COMPANY_ACCOUNT_ADDRESS=0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7
```

## Step 2: Update Frontend Environment Variable

**File:** `apps/web/.env.local` or `apps/web/.env`

```env
NEXT_PUBLIC_COMPANY_ACCOUNT=0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7
```

## Step 3: Rebuild and Restart

### Backend:
```bash
cd apps/api
pnpm build
pm2 restart beehive-api
# or
pnpm start
```

### Frontend:
```bash
cd apps/web
pnpm build
pm2 restart beehive-web
# or
pnpm start
```

**Important:** Next.js caches environment variables at build time. You **MUST rebuild** the frontend for the change to take effect!

## Step 4: Verify

1. Check backend logs on startup - should show:
   ```
   COMPANY_ACCOUNT_ADDRESS: 0x325d4a6f26babf3fb54a838a2fe6a79cf3087cf7
   ```

2. Check frontend - in browser console, check:
   ```javascript
   // Should show new address
   console.log(CONTRACTS.COMPANY_ACCOUNT)
   ```

3. Try a test purchase - transaction should go to the new address

## Files That Use Company Wallet Address

### Backend (uses `COMPANY_ACCOUNT_ADDRESS`):
- `apps/api/src/utils/paymentDistribution.ts`
- `apps/api/src/utils/transactionVerification.ts`
- `apps/api/src/services/BlockchainService.ts`
- `apps/api/src/services/NFTService.ts`

### Frontend (uses `NEXT_PUBLIC_COMPANY_ACCOUNT`):
- `apps/web/src/lib/contracts.ts` - Defines `CONTRACTS.COMPANY_ACCOUNT`
- `apps/web/src/hooks/useContracts.ts` - Uses `CONTRACTS.COMPANY_ACCOUNT` for transfers

## Why Both Are Needed

- **Backend** uses `COMPANY_ACCOUNT_ADDRESS` to:
  - Verify transactions (check if USDT was sent to correct address)
  - Process automatic transfers (30 USDT to IT wallet)
  - Record transactions in database

- **Frontend** uses `NEXT_PUBLIC_COMPANY_ACCOUNT` to:
  - Send USDT transfers to the company wallet
  - Display company wallet address in UI (if needed)

## Troubleshooting

### Transaction still going to old address?
1. ✅ Check `apps/web/.env.local` has `NEXT_PUBLIC_COMPANY_ACCOUNT` set
2. ✅ Rebuild frontend: `cd apps/web && pnpm build`
3. ✅ Clear browser cache and hard refresh (Ctrl+Shift+R)
4. ✅ Check browser console for `CONTRACTS.COMPANY_ACCOUNT` value

### Backend verification failing?
1. ✅ Check `apps/api/.env` has `COMPANY_ACCOUNT_ADDRESS` set
2. ✅ Restart API server
3. ✅ Check API logs on startup for the address

### Both addresses must match!
The frontend sends to `NEXT_PUBLIC_COMPANY_ACCOUNT` and the backend expects `COMPANY_ACCOUNT_ADDRESS`. They must be the same!

