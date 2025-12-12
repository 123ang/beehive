# TUSDT Contract Integration

## Overview
The membership purchase functionality has been linked to the TUSDT (Test USDT) contract for payment processing.

## Contract Address
- **TUSDT Contract**: `0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85`
- **Token**: TUSDT (Test USDT)
- **Decimals**: 6 (matching real USDT standard)

## Changes Made

### 1. Contract Configuration (`apps/web/src/lib/contracts.ts`)
Updated the default USDT contract address:
```typescript
USDT: process.env.NEXT_PUBLIC_USDT_CONTRACT || "0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85", // TUSDT (Test USDT)
```

## How It Works

### Purchase Flow
1. **User connects wallet** → Wallet address is detected
2. **User selects membership level** → Level price is displayed in TUSDT
3. **Check TUSDT balance** → `useUSDTBalance()` reads balance from TUSDT contract
4. **Approve TUSDT spending** → `useApproveUSDT()` approves membership contract to spend TUSDT
5. **Purchase membership** → `usePurchaseLevel()` calls membership contract's `purchaseLevel()` function
6. **TUSDT transfer** → Membership contract transfers TUSDT from user to contract

### Key Hooks
- **`useUSDTBalance()`**: Reads user's TUSDT balance (6 decimals)
- **`useUSDTAllowance()`**: Checks approved TUSDT amount for membership contract
- **`useApproveUSDT()`**: Approves TUSDT spending for membership contract
- **`usePurchaseLevel()`**: Calls membership contract to purchase level
- **`usePurchaseMembership()`**: Combined hook that handles approval + purchase flow

## Environment Variables

You can override the contract address using environment variables:

```env
NEXT_PUBLIC_USDT_CONTRACT=0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85
NEXT_PUBLIC_MEMBERSHIP_CONTRACT=<your_membership_contract_address>
NEXT_PUBLIC_REWARDS_CONTRACT=<your_rewards_contract_address>
NEXT_PUBLIC_BCC_TOKEN_CONTRACT=<your_bcc_token_contract_address>
```

## Important Notes

1. **TUSDT Decimals**: The code uses 6 decimals for TUSDT (as defined in the contract)
   - `formatUnits(data, 6)` for displaying balances
   - `parseUnits(amount, 6)` for converting amounts to wei

2. **Membership Contract**: The membership contract must be configured to accept TUSDT at the specified address. Make sure:
   - Membership contract's `usdtToken` variable points to `0x23D744B43aEe545DaBeC0D2081bD381Ab80C7d85`
   - Users have sufficient TUSDT balance
   - Users have approved the membership contract to spend TUSDT

3. **Network**: Ensure you're on the correct network (BSC/BEP20) where the TUSDT contract is deployed

## Testing

To test the integration:
1. Connect a wallet with TUSDT balance
2. Navigate to `/membership` page
3. Select a membership level
4. Approve TUSDT spending (if not already approved)
5. Confirm purchase transaction
6. Verify membership level is updated in the contract

## Files Modified

- `apps/web/src/lib/contracts.ts`: Updated TUSDT contract address

## Related Files

- `apps/web/src/hooks/useContracts.ts`: Contains all contract interaction hooks
- `apps/web/src/components/web3/PurchaseModal.tsx`: Purchase UI component
- `apps/web/src/app/membership/page.tsx`: Membership purchase page
- `contracts/src/TUSDT.sol`: TUSDT token contract

