# 🔐 Authentication System Explained

## Overview

Your authentication system uses **two separate tables** with different purposes:

1. **`users` table** - For authentication (SIWE - Sign-In with Ethereum)
2. **`members` table** - For membership data (levels, rewards, matrix placement)

---

## 🔑 How Authentication Works

### Step 1: User Connects Wallet

When a user connects their wallet to your app:

1. Frontend calls `/api/auth/nonce` with wallet address
2. Backend creates/updates a record in the **`users` table**:
   ```typescript
   // apps/api/src/routes/auth.ts:49
   await db.insert(users).values({
     walletAddress: normalizedAddress,
     nonce,  // Random nonce for signature verification
   });
   ```

### Step 2: User Signs Message (SIWE)

1. User signs a message with their wallet (MetaMask, etc.)
2. Frontend calls `/api/auth/verify` with:
   - Wallet address
   - Signed message
   - Signature

3. Backend verifies the signature and generates a **JWT token**:
   ```typescript
   // apps/api/src/routes/auth.ts:117
   const token = await generateToken({
     userId: user.id,              // From users table
     walletAddress: normalizedAddress,  // From users table
     isAdmin: user.isAdmin || false,   // From users table
   });
   ```

### Step 3: JWT Token Contents

The JWT token contains:
```typescript
{
  userId: number,        // users.id
  walletAddress: string, // users.wallet_address
  isAdmin: boolean      // users.is_admin
}
```

**Important:** The JWT token is based on the **`users` table**, NOT the `members` table.

---

## 👥 Users vs Members

### `users` Table
- **Purpose:** Authentication and user profile
- **Created:** When user first connects wallet
- **Contains:**
  - Wallet address (for authentication)
  - Nonce (for SIWE)
  - User profile (username, email, etc.)
  - Admin status

### `members` Table
- **Purpose:** Membership and rewards data
- **Created:** When user purchases their first membership (Level 1)
- **Contains:**
  - Wallet address (same as users table)
  - Current membership level
  - Rewards (BCC balance, USDT rewards)
  - Matrix placement (sponsor, downlines)
  - Total inflow/outflow

### Relationship

```
users table                    members table
┌─────────────┐               ┌─────────────┐
│ id: 1       │               │ id: 1       │
│ wallet: 0x..│ ──────────────>│ wallet: 0x..│
│ isAdmin: F  │               │ level: 3     │
│             │               │ bccBalance  │
└─────────────┘               └─────────────┘
     ↑                              ↑
  Created when                  Created when
  wallet connects              first purchase
```

**Key Points:**
- A user can exist in `users` table WITHOUT being in `members` table
- A user becomes a member when they purchase Level 1 membership
- Both tables use the same `wallet_address` as the identifier
- They are **NOT** linked by foreign key - linked by wallet address

---

## 🔒 How Financial Endpoints Work

### Current Implementation

When a user tries to upgrade or withdraw:

1. **Authentication Check:**
   ```typescript
   // JWT token contains wallet address from users table
   const user = c.get("user");  // From authMiddleware
   // user.walletAddress comes from users table
   ```

2. **Ownership Verification:**
   ```typescript
   // Verify JWT wallet matches request wallet
   if (user.walletAddress.toLowerCase() !== normalizedWallet) {
     return c.json({ error: "Unauthorized" }, 403);
   }
   ```

3. **Member Check:**
   ```typescript
   // Check if wallet exists in members table
   const existingMember = await db.query.members.findFirst({
     where: eq(members.walletAddress, normalizedWallet),
   });
   
   if (!existingMember) {
     return c.json({ error: "Member not found" }, 404);
   }
   ```

### Flow Diagram

```
User Request
    ↓
JWT Token (from users table)
    ↓
authMiddleware extracts walletAddress from JWT
    ↓
Verify: JWT.walletAddress === request.walletAddress
    ↓
Check: walletAddress exists in members table
    ↓
Process financial operation
```

---

## ✅ Current Security Implementation

### Authentication
- ✅ Based on `users` table wallet address
- ✅ JWT token contains `users.walletAddress`
- ✅ Signature verification via SIWE

### Authorization
- ✅ Wallet ownership verified (JWT wallet === request wallet)
- ✅ Member existence checked (wallet in `members` table)
- ✅ Rate limiting per wallet address

### What's Protected
- `/api/members/upgrade` - Requires auth + member check
- `/api/members/withdraw` - Requires auth + member check
- `/api/members/register` - Creates member from user

---

## 🎯 Answer to Your Question

**Q: Is the user based on members table's wallet address or what?**

**A:** The authentication is based on the **`users` table's wallet address**, not the `members` table.

**Here's how it works:**

1. **Authentication (JWT token):**
   - Uses `users.wallet_address` from the `users` table
   - Created when user connects wallet (before becoming a member)

2. **Authorization (financial operations):**
   - Verifies JWT wallet matches request wallet (from `users` table)
   - Then checks if wallet exists in `members` table (for membership data)

3. **Why two tables?**
   - `users` table: Anyone can authenticate (connect wallet)
   - `members` table: Only those who purchased membership
   - A user can authenticate but not be a member yet

---

## 📝 Example Scenarios

### Scenario 1: New User (Not a Member)
```
1. User connects wallet → Record created in users table
2. User gets JWT token (based on users table)
3. User tries to upgrade → ❌ Fails: "Member not found"
4. User must register (purchase Level 1) first
```

### Scenario 2: Existing Member
```
1. User connects wallet → JWT token (from users table)
2. User tries to upgrade → ✅ Passes:
   - JWT wallet matches request wallet ✓
   - Wallet exists in members table ✓
   - Process upgrade
```

### Scenario 3: User Tries to Act on Another Wallet
```
1. User has JWT with wallet: 0xAAA...
2. User sends request with wallet: 0xBBB...
3. System checks: 0xAAA !== 0xBBB
4. Result: ❌ 403 Forbidden
```

---

## 🔧 Code References

### Authentication (users table)
- **File:** `apps/api/src/routes/auth.ts`
- **Token Generation:** Line 117-121
- **JWT Payload:** `apps/api/src/lib/jwt.ts:14-18`

### Authorization (members table)
- **File:** `apps/api/src/routes/members.ts`
- **Upgrade Endpoint:** Line 552-578
- **Withdraw Endpoint:** Line 706-723

---

## 💡 Summary

| Aspect | Table Used | Purpose |
|--------|-----------|---------|
| **Authentication** | `users` | JWT token generation, SIWE verification |
| **Authorization** | `users` + `members` | Verify ownership + check membership |
| **Financial Operations** | `members` | Get membership level, rewards, etc. |
| **User Profile** | `users` | Username, email, preferences |

**Key Takeaway:** 
- Authentication = `users` table (wallet address)
- Membership Data = `members` table (same wallet address)
- Financial operations require BOTH: authenticated user + existing member

---

**Last Updated:** $(date)

