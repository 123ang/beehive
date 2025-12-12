# Payment Distribution System

## Overview
This system handles USDT payment distribution for membership purchases and rewards according to the following rules:

## Payment Rules

### 1. Level 1 Purchase (130 USDT)
- **100 USDT** → Company Account (`0xba48b5b1f835ebfc5174c982405b3a7a11b655d0`)
- **30 USDT** → IT Account (`0xe44a701211ef9d3a4ad674986291afcae07bcfc4`)

### 2. Level Upgrades (Level 2-19)
- **100% of payment** → Company Account
- No payment to IT Account

### 3. USDT Rewards (Direct Sponsor & Layer Payouts)
- **100% paid from** → Company Account
- When a user claims USDT rewards (e.g., 100 USDT for sponsoring 1 user), the payment comes from the company account

## Implementation

### Environment Variables
Add to `.env`:
```env
COMPANY_ACCOUNT_ADDRESS=0xba48b5b1f835ebfc5174c982405b3a7a11b655d0
IT_ACCOUNT_ADDRESS=0xe44a701211ef9d3a4ad674986291afcae07bcfc4
```

### Payment Distribution Service
**File**: `apps/api/src/utils/paymentDistribution.ts`

#### Functions:
1. **`distributePurchasePayment()`**
   - Called when a user purchases/upgrades a membership level
   - Handles Level 1 split (100/30) and upgrade (100% to company)
   - Records transactions in the database

2. **`processUSDTRewardPayment()`**
   - Called when USDT rewards are paid out
   - Records payment from company account to recipient
   - Records withdrawal from company account

### Integration Points

#### 1. Member Registration (`apps/api/src/routes/members.ts`)
- When a new member registers with Level 1 purchase
- Calls `distributePurchasePayment()` with `previousLevel = 0`

#### 2. Reward Service (`apps/api/src/services/RewardService.ts`)
- **Direct Sponsor Rewards**: When instant rewards are created, calls `processUSDTRewardPayment()`
- **Layer Payout Rewards**: When instant rewards are created, calls `processUSDTRewardPayment()`
- **Pending Reward Release**: When pending rewards are released after upgrade, processes payments

### Transaction Records

All payments are recorded in the `transactions` table:
- **Type**: `deposit` (for receiving payments) or `withdrawal` (for paying out)
- **Currency**: `USDT`
- **Status**: `confirmed`
- **Notes**: Description of the payment

### Example Flow

#### Level 1 Purchase:
1. User purchases Level 1 (130 USDT)
2. `distributePurchasePayment()` is called
3. Two transactions created:
   - 100 USDT deposit to company account
   - 30 USDT deposit to IT account

#### Direct Sponsor Reward:
1. User sponsors a new Level 1 member
2. Reward record created (100 USDT, status: instant)
3. `processUSDTRewardPayment()` is called
4. Two transactions created:
   - 100 USDT deposit to sponsor's wallet (from company)
   - 100 USDT withdrawal from company account

#### Level Upgrade:
1. User upgrades from Level 1 to Level 2 (e.g., 200 USDT)
2. `distributePurchasePayment()` is called with `previousLevel = 1`
3. One transaction created:
   - 200 USDT deposit to company account (100% of upgrade)

## Notes

- All amounts are stored with 18 decimal precision
- Transactions are recorded for audit purposes
- The system tracks both inflows and outflows for company and IT accounts
- USDT rewards are always paid from the company account balance

