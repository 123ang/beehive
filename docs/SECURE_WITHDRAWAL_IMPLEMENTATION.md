# 🔐 Secure Withdrawal System Implementation

## Overview

This document describes the secure, queue-based withdrawal system that follows the architecture from the design document.

---

## ✅ What Was Implemented

### 1. **Database Schema**

**New Table: `withdrawals`**
- Tracks withdrawal requests with status
- Links to `users` and `members` tables
- Stores transaction hash, error messages, timestamps

**Migration File:** `apps/api/src/scripts/migrations/create-withdrawals-table.sql`

### 2. **Queue System (BullMQ)**

**File:** `apps/api/src/queues/withdrawalQueue.ts`
- Uses Redis (already in your stack)
- Job retry logic (3 attempts with exponential backoff)
- Job cleanup (keeps completed jobs for 24h, failed for 7 days)

### 3. **Worker Service**

**File:** `apps/api/src/workers/withdrawalWorker.ts`
- Processes withdrawals asynchronously
- **Never trusts client input** - reads only from database
- Steps:
  1. Lock withdrawal row
  2. Re-check balance from database
  3. Build ERC-20 transfer
  4. Sign transaction (using KMS or .env private key)
  5. Broadcast transaction
  6. Update balances
  7. Mark withdrawal as completed

### 4. **New Secure Endpoint**

**Endpoint:** `POST /api/members/withdraw/v2`

**Request:**
```json
{
  "amount": 300,
  "currency": "USDT"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawalId": 123,
    "status": "requested",
    "message": "Withdrawal request created. Processing 300 USDT..."
  }
}
```

**Key Features:**
- ✅ Client sends **only amount** (no wallet address)
- ✅ Server derives wallet from authenticated user
- ✅ Creates withdrawal request in database
- ✅ Adds to queue for async processing
- ✅ Returns immediately (non-blocking)

### 5. **Status Endpoint**

**Endpoint:** `GET /api/members/withdraw/:withdrawalId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "currency": "USDT",
    "amount": "300",
    "status": "completed",
    "txHash": "0x...",
    "createdAt": "2024-01-01T00:00:00Z",
    "processedAt": "2024-01-01T00:00:01Z",
    "completedAt": "2024-01-01T00:00:05Z"
  }
}
```

### 6. **KMS Signing Service**

**File:** `apps/api/src/services/KMSSigningService.ts`
- **Note:** Currently uses private key from KMS storage (same as KMSService)
- For true KMS signing, you'll need an **asymmetric signing key** in Google KMS
- See "KMS Signing Setup" section below

### 7. **Worker Auto-Start**

**File:** `apps/api/src/index.ts`
- Worker starts automatically when API server starts
- Can be disabled with `ENABLE_WITHDRAWAL_WORKER=false`

---

## 🔒 Security Features

### ✅ Implemented

1. **No Client Wallet Address**
   - Wallet derived from authenticated user
   - Cannot withdraw to arbitrary addresses

2. **Database-Only Balance Check**
   - Worker re-checks balance from database
   - Never trusts client input

3. **Queue-Based Processing**
   - Async processing prevents blocking
   - Retry logic for failed transactions
   - Idempotency via job IDs

4. **Status Tracking**
   - Full audit trail of withdrawal lifecycle
   - Error messages stored for debugging

5. **Rate Limiting**
   - Financial rate limiter applied (3 requests per 10 minutes)

### ⚠️ Still Using Current Approach

**KMS Signing:**
- Currently uses private key from KMS storage (decrypts and uses locally)
- For true KMS signing, need asymmetric signing key (see below)

**Why:** Google KMS for Ethereum signing requires:
- Asymmetric signing key (not encryption key)
- Custom signature format conversion (r, s, v)
- More complex setup

**Current approach is still secure** - private key is encrypted in KMS, but signing happens locally after decryption.

---

## 📋 Setup Instructions

### Step 1: Run Database Migration

```bash
# Option 1: Direct SQL
mysql -u beehive_user -p beehive < apps/api/src/scripts/migrations/create-withdrawals-table.sql

# Option 2: Using Drizzle
cd apps/api
pnpm db:push
```

### Step 2: Verify Worker Starts

When you start the API server, you should see:
```
🟢 Withdrawal worker started
✅ Withdrawal worker started
```

### Step 3: Test New Endpoint

```bash
# Create withdrawal request
curl -X POST http://localhost:4001/api/members/withdraw/v2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USDT"}'

# Check status
curl http://localhost:4001/api/members/withdraw/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔄 Withdrawal Flow

```
1. Client → POST /withdraw/v2 { amount, currency }
   ↓
2. API → Verify auth, check balance, create withdrawal record
   ↓
3. API → Add job to queue, return withdrawalId
   ↓
4. Worker → Pick up job from queue
   ↓
5. Worker → Lock withdrawal, re-check balance
   ↓
6. Worker → Build transaction, sign (KMS or .env)
   ↓
7. Worker → Broadcast to blockchain
   ↓
8. Worker → Wait for confirmation
   ↓
9. Worker → Update balances, mark completed
   ↓
10. Client → GET /withdraw/:id to check status
```

---

## 📊 Withdrawal Statuses

- **`requested`** - Created by API, waiting in queue
- **`processing`** - Worker picked up, checking balance
- **`broadcast`** - Transaction sent to blockchain
- **`completed`** - Transaction confirmed on-chain
- **`failed`** - Error occurred (check errorMessage)

---

## 🔧 Configuration

### Environment Variables

```env
# Queue/Worker
ENABLE_WITHDRAWAL_WORKER=true  # Set to false to disable worker

# KMS (optional - falls back to .env if not set)
USE_GOOGLE_KMS=true
GOOGLE_CLOUD_PROJECT_ID=beehive-kms
GOOGLE_KMS_LOCATION=us
GOOGLE_KMS_KEY_RING=beehive-keyring
GOOGLE_KMS_KEY_NAME=company-private-key
GOOGLE_APPLICATION_CREDENTIALS=C:\secure\kms-service-account.json

# Or use .env fallback
COMPANY_PRIVATE_KEY=0x...
```

---

## 🆚 Old vs New Endpoint

### Old Endpoint (`/withdraw`)
- ✅ Still works (backward compatibility)
- ❌ Accepts wallet address from client
- ❌ Synchronous (blocks until complete)
- ❌ No queue/retry logic

### New Endpoint (`/withdraw/v2`)
- ✅ Only accepts amount (wallet from auth)
- ✅ Async processing (returns immediately)
- ✅ Queue-based with retry logic
- ✅ Full status tracking
- ✅ Better error handling

---

## 🚀 KMS Signing Setup (Future Enhancement)

For true KMS signing (transaction hash → KMS → signature):

### Step 1: Create Asymmetric Signing Key

```bash
gcloud kms keys create company-signing-key \
  --keyring=beehive-keyring \
  --location=us \
  --purpose=asymmetric-signing \
  --default-algorithm=ec-sign-p256-sha256
```

### Step 2: Update KMSSigningService

The service is already created but needs:
- Use asymmetric signing key
- Convert KMS signature to Ethereum format (r, s, v)
- Handle EIP-155 transaction signing

**Current Implementation:**
- Uses encryption key to decrypt private key
- Signs locally (still secure, but not true KMS signing)

**Future Implementation:**
- Uses signing key to sign transaction hash
- Returns signature only (private key never decrypted)

---

## 📝 API Usage Examples

### Frontend Integration

```typescript
// Create withdrawal
const response = await api.post("/api/members/withdraw/v2", {
  amount: 300,
  currency: "USDT"
});

const { withdrawalId } = response.data;

// Poll for status
const checkStatus = async () => {
  const status = await api.get(`/api/members/withdraw/${withdrawalId}`);
  
  if (status.data.status === "completed") {
    console.log("Withdrawal completed!", status.data.txHash);
  } else if (status.data.status === "failed") {
    console.error("Withdrawal failed:", status.data.errorMessage);
  } else {
    // Still processing, check again in 2 seconds
    setTimeout(checkStatus, 2000);
  }
};

checkStatus();
```

---

## ✅ Summary

**Implemented:**
- ✅ Queue-based withdrawal system
- ✅ New secure endpoint (amount only)
- ✅ Worker service (async processing)
- ✅ Status tracking
- ✅ Database schema
- ✅ Balance checking from members table
- ✅ KMS integration (storage, signing via decryption)

**Ready to Use:**
- Old endpoint still works
- New endpoint available at `/withdraw/v2`
- Worker starts automatically
- Full backward compatibility

**Next Steps (Optional):**
- Implement true KMS signing (asymmetric key)
- Add daily/weekly withdrawal limits
- Add withdrawal cooldown
- Add email notifications

---

**Last Updated:** $(date)

