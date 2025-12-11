
# Beehive Admin System & NFT Contract Specification

## 1. Overview

This document describes the **Admin Feature Set** and the **Beehive NFT Smart Contract** used for membership / access NFTs.

Key decisions:

- NFT standard: **ERC‑721**
- Metadata: **off-chain** (served by backend via `tokenURI` / base URI)
- Contract stores:
  - `short_name` (per collection)
  - `maxSupply` (per collection)
  - `minted` count (per collection)
  - `tokenCollection` mapping (which collection each token belongs to)
- Admin can:
  - Create NFT collections (e.g. “NFT A” with 1000 supply)
  - Batch-mint NFTs from a collection to users
- No per-user holding limit enforced on-chain.

---

## 2. Admin Roles & Permission System

### 2.1 Role Types

- **Master Admin**
  - Full access to all admin features.
  - Can manage roles and other admins.
- **Custom Admin Roles** (e.g. Operation, Support, Marketing)
  - Permissions are toggled per role.
  - Example: Operation cannot delete news (`news.delete` disabled).

### 2.2 Permission Groups

Permissions are namespaced strings, e.g. `news.create`, `nft.create`, etc.

- **Admin Management**
  - `admin.manage_admins` (Master Admin only - CRUD operations on other admins)
  - `admin.manage_roles`

- **User Management**
  - `user.list` (View user list)
  - `user.view` (View user details)
  - `user.modify_address` (Request member address modification - requires master admin approval)
  - `user.bulk_import` (Bulk import users from CSV/Excel file)

- **NFT Management**
  - `nft.create`
  - `nft.update`
  - `nft.delete`
  - `nft.mint`

- **News Management**
  - `news.create`
  - `news.update`
  - `news.delete`
  - `news.multilingual`

- **Education / Class Management**
  - `class.create`
  - `class.update`
  - `class.delete`
  - `class.manage_meetings`

- **Merchant Management**
  - `merchant.create`
  - `merchant.update`
  - `merchant.delete`

- **Merchant Ads**
  - `merchant_ads.create`
  - `merchant_ads.update`
  - `merchant_ads.delete`

- **Purchase Field Configuration**
  - `purchase_fields.update`

- **Activity Logs**
  - `logs.view`
  - `logs.export`

- **Dashboard**
  - `dashboard.view` (View admin dashboard with metrics)

### 2.3 Role Enforcement Pattern

Backend helper (pseudo-code):

```ts
function assertPermission(adminId: string, permission: string) {
  const perms = getAdminPermissionsFromDB(adminId);
  if (!perms.includes(permission)) {
    throw new Error("FORBIDDEN");
  }
}
```

All admin routes call `assertPermission` before executing core logic.

---

## 3. Admin Dashboard

The Admin Dashboard provides a comprehensive overview of platform metrics, user statistics, revenue data, and system health indicators.

### 3.1 Dashboard Overview

The dashboard displays real-time and historical metrics to help admins monitor platform performance, user growth, revenue, and operational status.

**Permission**: `dashboard.view` (available to all admins)

### 3.2 User Metrics

#### 3.2.1 User Statistics

| Metric | Description | Time Range Options |
|--------|-------------|-------------------|
| **Total Users** | Total number of registered users | All time |
| **New Users** | Count of users registered in selected period | Today, This Week, This Month, Last Month, Custom Range |
| **Active Users** | Users who logged in within the last 30 days | Last 30 days |
| **Users by Membership Level** | Distribution of users across 19 membership levels | All time |
| **User Growth Rate** | Percentage change in user count (period over period) | Weekly, Monthly |

#### 3.2.2 User Status Breakdown

- Active users
- Suspended users
- Inactive users (no login in 90+ days)

### 3.3 Revenue Metrics

#### 3.3.1 Earnings Overview

| Metric | Description | Time Range Options |
|--------|-------------|-------------------|
| **Total Earnings (USDT)** | Cumulative revenue from all NFT/membership purchases | All time |
| **Earnings This Month (USDT)** | Revenue generated in the current month | Current month |
| **Earnings Last Month (USDT)** | Revenue generated in the previous month | Last month |
| **Average Revenue Per User (ARPU)** | Total revenue divided by total users | All time / Monthly |
| **Revenue Trend** | Line chart showing revenue over time | Daily, Weekly, Monthly |

#### 3.3.2 Revenue Breakdown

- Revenue by membership level
- Revenue by payment method (if applicable)
- Top spending users
- Revenue forecast (based on trends)

### 3.4 Rewards & BCC Metrics

#### 3.4.1 Rewards Statistics

| Metric | Description | Time Range Options |
|--------|-------------|-------------------|
| **Total Rewards Released (BCC)** | Total BCC tokens distributed to users | All time |
| **Rewards Released This Month (BCC)** | BCC tokens distributed in current month | Current month |
| **Pending Rewards (BCC)** | Rewards queued but not yet claimed | Current |
| **Average Reward Per User** | Total rewards divided by total users | All time |
| **Reward Distribution by Level** | BCC rewards broken down by membership level | All time / Monthly |

#### 3.4.2 Rewards Activity

- Rewards claimed today/this week/this month
- Rewards pending approval (if applicable)
- Top reward recipients
- Reward claim rate (percentage of eligible rewards claimed)

### 3.5 NFT & Membership Metrics

#### 3.5.1 NFT Statistics

| Metric | Description | Time Range Options |
|--------|-------------|-------------------|
| **Total NFTs Minted** | Total number of NFTs minted across all collections | All time |
| **NFTs Minted This Month** | NFTs minted in current month | Current month |
| **NFTs by Collection** | Distribution of NFTs across collections | All time |
| **Collection Utilization** | Percentage of max supply used per collection | Current |
| **Membership Upgrades** | Number of users who upgraded membership levels | Today, This Week, This Month |

#### 3.5.2 Membership Distribution

- Users per membership level (1-19)
- Most popular membership levels
- Upgrade/downgrade trends

### 3.6 Transaction Metrics

#### 3.6.1 Transaction Statistics

| Metric | Description | Time Range Options |
|--------|-------------|-------------------|
| **Total Transactions** | Total number of completed transactions | All time |
| **Transactions This Month** | Transactions in current month | Current month |
| **Average Transaction Value** | Average USDT amount per transaction | All time / Monthly |
| **Transaction Success Rate** | Percentage of successful vs failed transactions | Daily, Weekly, Monthly |
| **Pending Transactions** | Number of transactions awaiting completion | Current |

### 3.7 Platform Activity Metrics

#### 3.7.1 Engagement Statistics

| Metric | Description | Time Range Options |
|--------|-------------|-------------------|
| **Daily Active Users (DAU)** | Users who logged in today | Today |
| **Weekly Active Users (WAU)** | Users who logged in this week | This week |
| **Monthly Active Users (MAU)** | Users who logged in this month | This month |
| **Average Session Duration** | Average time users spend on platform | Daily, Weekly |
| **Page Views** | Total page views (if applicable) | Daily, Weekly, Monthly |

### 3.8 System Health Metrics

#### 3.8.1 Operational Status

| Metric | Description | Status Indicators |
|--------|-------------|-------------------|
| **API Status** | Backend API health | Healthy / Degraded / Down |
| **Database Status** | Database connection and performance | Healthy / Warning / Error |
| **Blockchain Connection** | Connection to blockchain network | Connected / Disconnected |
| **Cache Status** | Redis/cache system status | Healthy / Warning |
| **Storage Usage** | Disk space and database size | Percentage used |

#### 3.8.2 Performance Metrics

- Average API response time
- Error rate (percentage of failed requests)
- Queue length (if using job queues)
- Database query performance

### 3.9 Recent Activity Feed

The dashboard includes a real-time activity feed showing:

- Recent user registrations
- Recent NFT purchases
- Recent reward claims
- Recent admin actions
- System alerts and notifications

### 3.10 Dashboard Features

#### 3.10.1 Time Range Selection

- Predefined ranges: Today, This Week, This Month, Last Month, Last 3 Months, Last 6 Months, Last Year, All Time
- Custom date range picker
- Comparison mode (compare current period vs previous period)

#### 3.10.2 Data Visualization

- Line charts for trends (revenue, users, rewards over time)
- Bar charts for comparisons (revenue by level, user distribution)
- Pie charts for distributions (membership levels, collection breakdown)
- Tables for detailed data
- Sparklines for quick trend indicators

#### 3.10.3 Export & Reporting

- Export dashboard data to CSV/Excel
- Generate PDF reports
- Schedule automated reports (email delivery)
- Custom report builder

### 3.11 Dashboard Data Model

#### 3.11.1 Aggregated Metrics Table

For performance, metrics can be pre-aggregated and stored:

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Record ID |
| `metric_date` | date | Date of the metric |
| `metric_type` | string | Type (e.g., 'revenue', 'users', 'rewards') |
| `metric_value` | decimal | Value of the metric |
| `metadata` | json | Additional context (level, collection, etc.) |
| `created_at` | datetime | Record creation timestamp |

#### 3.11.2 Real-time vs Cached Data

- **Real-time**: Current day metrics, pending transactions, system status
- **Cached (updated hourly)**: Historical metrics, aggregated statistics
- **Cached (updated daily)**: Long-term trends, monthly summaries

### 3.12 Dashboard API Endpoints (Pseudo-code)

```ts
// Get dashboard overview
GET /api/admin/dashboard/overview?period=month&startDate=2025-01-01&endDate=2025-01-31

Response:
{
  "userMetrics": {
    "totalUsers": 1250,
    "newUsers": 45,
    "activeUsers": 890,
    "usersByLevel": { "1": 200, "2": 150, ... }
  },
  "revenueMetrics": {
    "totalEarnings": 125000.50,
    "earningsThisMonth": 8500.25,
    "earningsLastMonth": 7200.00,
    "arpu": 100.00
  },
  "rewardsMetrics": {
    "totalRewardsReleased": 50000.00,
    "rewardsThisMonth": 3500.00,
    "pendingRewards": 1200.00
  },
  "nftMetrics": {
    "totalMinted": 500,
    "mintedThisMonth": 25,
    "byCollection": { "A": 200, "B": 150, ... }
  },
  "systemHealth": {
    "apiStatus": "healthy",
    "databaseStatus": "healthy",
    "blockchainStatus": "connected"
  }
}

// Get revenue trend
GET /api/admin/dashboard/revenue-trend?period=month&granularity=daily

// Get user growth
GET /api/admin/dashboard/user-growth?period=month&granularity=weekly
```

### 3.13 Dashboard Permissions

- **All Admins**: Can view basic dashboard metrics
- **Master Admin**: Full access to all metrics including financial data
- **Custom Roles**: Can be restricted from viewing sensitive financial metrics if needed

---

## 4. User List Management

Admins can view and manage the list of platform users/members.

### 4.1 User List Features

- **View User List**
  - All admins can view the user list with basic information.
  - Permission: `user.list`
- **View User Details**
  - Admins can view detailed information about a specific user.
  - Permission: `user.view`
- **Search & Filter**
  - Search by wallet address, email, name, or user ID.
  - Filter by membership level, registration date, status, etc.

### 4.2 User Data Fields

| Field            | Type      | Description                           |
|------------------|-----------|---------------------------------------|
| `id`             | int       | Internal user ID                      |
| `wallet_address` | string    | Primary wallet address (0x...)        |
| `email`          | string    | User email address                    |
| `name`           | string    | User full name                        |
| `phone`          | string    | Phone number                          |
| `membership_level`| int      | Current membership level (1-19)        |
| `registration_date`| datetime | Account creation timestamp            |
| `status`         | string    | `active`, `suspended`, `inactive`     |
| `total_spent`    | decimal   | Total amount spent on memberships     |
| `total_rewards`  | decimal   | Total BCC rewards earned             |
| `referral_code`  | string    | Unique referral code (auto-generated)  |
| `sponsor_id`     | int       | FK to user who referred this user     |
| `sponsor_address`| string    | Wallet address of the sponsor         |
| `member_id`      | string    | Auto-generated member ID              |

### 4.3 Bulk User Import (CSV/Excel)

Admins can bulk import users by uploading a CSV or Excel file containing wallet addresses. These users will automatically be registered as Level 1 members without requiring payment.

#### 4.3.1 Import Process

1. **File Upload**
   - Admin uploads CSV or Excel file via admin panel
   - Permission: `user.bulk_import`
   - Supported formats: `.csv`, `.xlsx`, `.xls`

2. **File Validation**
   - System validates file format and structure
   - Checks for required columns (wallet_address)
   - Validates wallet address format (must be valid Ethereum address)
   - Checks for duplicates (both in file and existing users)

3. **User Creation**
   - Each valid wallet address is automatically registered as a Level 1 member
   - Payment requirement is bypassed for bulk-imported users
   - Member ID is auto-generated
   - Referral code is auto-generated after wallet connection
   - Status is set to `active`

4. **Import Results**
   - System provides summary report:
     - Total rows processed
     - Successfully imported
     - Failed imports (with reasons)
     - Duplicate addresses skipped

#### 4.3.2 File Format Requirements

**CSV Format:**
```csv
wallet_address
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
0x8ba1f109551bD432803012645Hac136c22C9C00
0x1234567890123456789012345678901234567890
```

**Excel Format:**
- Column A: `wallet_address` (required)
- Optional columns (if provided, will be used):
  - Column B: `email`
  - Column C: `name`
  - Column D: `phone`

#### 4.3.3 Import Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Import batch ID |
| `uploaded_by` | int | FK to admin who uploaded |
| `file_name` | string | Original file name |
| `file_size` | int | File size in bytes |
| `total_rows` | int | Total rows in file |
| `successful_imports` | int | Number of users successfully imported |
| `failed_imports` | int | Number of failed imports |
| `duplicate_count` | int | Number of duplicate addresses |
| `status` | string | `processing`, `completed`, `failed` |
| `error_log` | text | Detailed error messages for failed imports |
| `created_at` | datetime | Import timestamp |

#### 4.3.4 Backend Workflow (Pseudo-code)

```ts
// Admin uploads file
async function bulkImportUsers(
  adminId: string,
  file: File
) {
  assertPermission(adminId, "user.bulk_import");
  
  // Validate file
  const fileType = getFileType(file.name);
  if (!['csv', 'xlsx', 'xls'].includes(fileType)) {
    throw new Error("Invalid file format");
  }
  
  // Parse file
  const rows = await parseFile(file);
  
  // Create import record
  const importRecord = createImportRecord({
    uploaded_by: adminId,
    file_name: file.name,
    file_size: file.size,
    total_rows: rows.length,
    status: "processing"
  });
  
  const results = {
    successful: [],
    failed: [],
    duplicates: []
  };
  
  // Process each row
  for (const row of rows) {
    const walletAddress = row.wallet_address?.trim();
    
    // Validate wallet address
    if (!isValidAddress(walletAddress)) {
      results.failed.push({
        address: walletAddress,
        reason: "Invalid wallet address format"
      });
      continue;
    }
    
    // Check if user already exists
    const existingUser = await getUserByWallet(walletAddress);
    if (existingUser) {
      results.duplicates.push({ address: walletAddress });
      continue;
    }
    
    // Create user as Level 1 member
    try {
      const user = await createUser({
        wallet_address: walletAddress,
        email: row.email || null,
        name: row.name || null,
        phone: row.phone || null,
        membership_level: 1,
        status: "active",
        registration_date: now(),
        is_bulk_imported: true,
        bulk_import_id: importRecord.id
      });
      
      // Generate member ID
      const memberId = generateMemberId(user.id);
      await updateUser(user.id, { member_id: memberId });
      
      results.successful.push({ address: walletAddress, userId: user.id });
      
      logActivity(adminId, "admin.bulk_import_user", {
        userId: user.id,
        walletAddress,
        importId: importRecord.id
      });
    } catch (error) {
      results.failed.push({
        address: walletAddress,
        reason: error.message
      });
    }
  }
  
  // Update import record
  await updateImportRecord(importRecord.id, {
    successful_imports: results.successful.length,
    failed_imports: results.failed.length,
    duplicate_count: results.duplicates.length,
    status: "completed",
    error_log: JSON.stringify(results.failed)
  });
  
  logActivity(adminId, "admin.bulk_import_complete", {
    importId: importRecord.id,
    total: rows.length,
    successful: results.successful.length,
    failed: results.failed.length
  });
  
  return {
    importId: importRecord.id,
    results
  };
}
```

### 4.4 Referral System

The platform includes an automated referral system where users can refer others and earn rewards through a referral link system.

#### 4.4.1 Referral Code Generation

- **Automatic Generation**: When a user connects their wallet for the first time, the system:
  1. Auto-detects the member ID (from database)
  2. Generates a unique referral code based on member ID
  3. Stores the referral code in the user's profile

- **Referral Code Format**: 
  - Format: `BEEHIVE-{MEMBER_ID}` or custom format (e.g., `BH-{MEMBER_ID}`)
  - Example: `BEEHIVE-12345` or `BH-12345`
  - Must be unique across all users

#### 4.4.2 Referral Link

- **Link Format**: `https://beehive-lifestyle.io/register?ref={REFERRAL_CODE}`
- **Example**: `https://beehive-lifestyle.io/register?ref=BEEHIVE-12345`
- Users can share this link with others

#### 4.4.3 Referral Link Processing

When a new user clicks a referral link:

1. **Auto-fill Referral Code**
   - The referral code from the URL parameter (`?ref=`) is automatically filled in the registration form
   - User can see who referred them (sponsor's name/address if available)

2. **Sponsor Assignment**
   - Upon successful registration, the referrer is automatically set as the new user's direct sponsor
   - The `sponsor_id` and `sponsor_address` fields are populated
   - This relationship is permanent and cannot be changed

3. **Registration Flow**
   ```
   User clicks referral link
   → Registration page loads with referral code pre-filled
   → User connects wallet
   → System validates referral code
   → User completes registration
   → Sponsor relationship is established
   → Referral code is generated for the new user
   ```

#### 4.4.4 Referral Data Model

**User Table (Additional Fields):**
| Field | Type | Description |
|-------|------|-------------|
| `referral_code` | string | Unique referral code (e.g., `BEEHIVE-12345`) |
| `sponsor_id` | int | FK to user who referred this user (direct sponsor) |
| `sponsor_address` | string | Wallet address of the sponsor |
| `member_id` | string | Auto-generated member ID |
| `referral_count` | int | Number of users referred by this user |
| `referral_rewards_earned` | decimal | Total BCC rewards earned from referrals |

**Referral Relationships Table:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Referral relationship ID |
| `sponsor_id` | int | FK to user who made the referral |
| `referred_user_id` | int | FK to user who was referred |
| `referral_code_used` | string | Referral code that was used |
| `referral_date` | datetime | When the referral was established |
| `status` | string | `active`, `inactive` |

#### 4.4.5 Referral System Workflow (Pseudo-code)

```ts
// Generate referral code when wallet is connected
async function generateReferralCode(userId: number) {
  const user = await getUser(userId);
  
  if (user.referral_code) {
    return user.referral_code; // Already generated
  }
  
  // Generate unique referral code
  const memberId = user.member_id || generateMemberId(userId);
  const referralCode = `BEEHIVE-${memberId}`;
  
  // Ensure uniqueness
  const existing = await getUserByReferralCode(referralCode);
  if (existing) {
    // If collision, append random suffix
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    referralCode = `BEEHIVE-${memberId}-${suffix}`;
  }
  
  await updateUser(userId, {
    referral_code: referralCode,
    member_id: memberId
  });
  
  return referralCode;
}

// Process referral link registration
async function registerWithReferral(
  walletAddress: string,
  referralCode: string,
  userData: { email?, name?, phone? }
) {
  // Validate referral code
  const sponsor = await getUserByReferralCode(referralCode);
  if (!sponsor) {
    throw new Error("Invalid referral code");
  }
  
  // Check if user already exists
  const existingUser = await getUserByWallet(walletAddress);
  if (existingUser) {
    throw new Error("User already registered");
  }
  
  // Create new user
  const newUser = await createUser({
    wallet_address: walletAddress,
    email: userData.email,
    name: userData.name,
    phone: userData.phone,
    membership_level: 1, // New users start at level 1
    sponsor_id: sponsor.id,
    sponsor_address: sponsor.wallet_address,
    registration_date: now(),
    status: "active"
  });
  
  // Generate member ID and referral code for new user
  const memberId = generateMemberId(newUser.id);
  const newReferralCode = await generateReferralCode(newUser.id);
  
  await updateUser(newUser.id, {
    member_id: memberId,
    referral_code: newReferralCode
  });
  
  // Create referral relationship
  await createReferralRelationship({
    sponsor_id: sponsor.id,
    referred_user_id: newUser.id,
    referral_code_used: referralCode,
    referral_date: now(),
    status: "active"
  });
  
  // Update sponsor's referral count
  await incrementReferralCount(sponsor.id);
  
  // Log activity
  logActivity(newUser.id, "user.register_with_referral", {
    sponsorId: sponsor.id,
    referralCode
  });
  
  logActivity(sponsor.id, "user.referred_new_user", {
    referredUserId: newUser.id
  });
  
  return {
    user: newUser,
    referralCode: newReferralCode
  };
}

// Get referral link for a user
function getReferralLink(userId: number): string {
  const user = getUser(userId);
  if (!user.referral_code) {
    throw new Error("Referral code not generated yet");
  }
  return `https://beehive-lifestyle.io/register?ref=${user.referral_code}`;
}
```

#### 4.4.6 Referral Rewards (Future Enhancement)

The referral system can be extended to include rewards:
- Sponsor earns BCC rewards when referred user purchases membership
- Multi-level rewards (direct sponsor, upline sponsors)
- Reward calculation based on membership level purchased

### 4.5 Admin Management (Master Admin Only)

**Master Admin** has exclusive CRUD (Create, Read, Update, Delete) permissions for managing other admins.

#### 4.5.1 Admin CRUD Operations

- **Create Admin**
  - Master Admin can create new admin accounts.
  - Assign role and permissions during creation.
  - Permission: `admin.manage_admins`
  
- **Read/View Admins**
  - Master Admin can view all admin accounts and their permissions.
  - Permission: `admin.manage_admins`
  
- **Update Admin**
  - Master Admin can update admin details:
    - Change role
    - Modify permissions
    - Update email, name, etc.
    - Activate/deactivate admin account
  - Permission: `admin.manage_admins`
  
- **Delete Admin**
  - Master Admin can delete admin accounts (with appropriate safeguards).
  - Permission: `admin.manage_admins`

#### 4.5.2 Admin Data Fields

| Field            | Type      | Description                           |
|------------------|-----------|---------------------------------------|
| `id`             | int       | Internal admin ID                     |
| `email`          | string    | Admin email (used for login)          |
| `name`           | string    | Admin full name                       |
| `role_id`        | int       | FK to role (Master Admin or custom)   |
| `permissions`    | array     | List of permission strings            |
| `active`         | boolean   | Whether admin account is active        |
| `created_at`     | datetime  | Account creation timestamp            |
| `last_login`     | datetime  | Last login timestamp                  |

> **Note**: Only Master Admin can perform CRUD operations on admin accounts. Regular admins cannot create, modify, or delete other admins.

---

## 5. Member Address Modification with Approval Workflow

Normal admins can request to modify a member's wallet address, but the change requires Master Admin approval before being applied.

### 5.1 Address Modification Request Flow

1. **Admin Submits Request**
   - Normal admin identifies a member and requests address change.
   - Provides:
     - Member ID or current wallet address
     - New wallet address
     - Reason for modification
   - Permission: `user.modify_address`
   
2. **Request Status**
   - Status values: `pending`, `approved`, `rejected`, `cancelled`
   - Request is stored in `address_modification_requests` table

3. **Master Admin Review**
   - Master Admin sees pending requests in admin dashboard
   - Can approve or reject the request
   - Permission: `admin.manage_admins` (or specific `admin.approve_address_change`)

4. **Address Update**
   - Upon approval, the member's wallet address is updated in the database
   - All related records (NFTs, rewards, transactions) are updated to reference the new address
   - Activity log records the change

### 5.2 Address Modification Request Fields

| Field            | Type      | Description                           |
|------------------|-----------|---------------------------------------|
| `id`             | int       | Request ID                            |
| `member_id`      | int       | FK to user/member                     |
| `current_address`| string   | Current wallet address                |
| `new_address`    | string    | Proposed new wallet address           |
| `requested_by`   | int       | FK to admin who created the request   |
| `reason`         | text      | Reason for address change              |
| `status`         | string    | `pending`, `approved`, `rejected`, `cancelled` |
| `approved_by`    | int       | FK to Master Admin (if approved)      |
| `rejection_reason`| text     | Reason for rejection (if rejected)    |
| `created_at`     | datetime  | Request creation timestamp            |
| `updated_at`     | datetime  | Last update timestamp                 |
| `approved_at`    | datetime  | Approval timestamp (if approved)      |

### 5.3 Backend Workflow (Pseudo-code)

```ts
// Normal admin creates request
function requestAddressChange(
  adminId: string,
  memberId: number,
  newAddress: string,
  reason: string
) {
  assertPermission(adminId, "user.modify_address");
  
  const member = getMember(memberId);
  const request = createAddressModificationRequest({
    member_id: memberId,
    current_address: member.wallet_address,
    new_address: newAddress,
    requested_by: adminId,
    reason: reason,
    status: "pending"
  });
  
  logActivity(adminId, "admin.request_address_change", { requestId: request.id });
  return request;
}

// Master Admin approves/rejects
function approveAddressChange(
  masterAdminId: string,
  requestId: number,
  approved: boolean,
  rejectionReason?: string
) {
  assertPermission(masterAdminId, "admin.manage_admins");
  
  const request = getAddressModificationRequest(requestId);
  if (approved) {
    // Update member address
    updateMemberAddress(request.member_id, request.new_address);
    
    // Update related records (NFTs, rewards, etc.)
    updateRelatedRecords(request.current_address, request.new_address);
    
    request.status = "approved";
    request.approved_by = masterAdminId;
    request.approved_at = now();
  } else {
    request.status = "rejected";
    request.rejection_reason = rejectionReason;
  }
  
  saveRequest(request);
  logActivity(masterAdminId, "admin.approve_address_change", { 
    requestId, 
    approved,
    memberId: request.member_id 
  });
}
```

### 5.4 Activity Log Events

- `admin.request_address_change` - When normal admin creates a request
- `admin.approve_address_change` - When Master Admin approves
- `admin.reject_address_change` - When Master Admin rejects
- `user.address_updated` - When address is actually updated

---

## 6. NFT Admin Feature (Off-Chain Metadata)

Admins can create NFT “collections” that are used by the platform (e.g. NFT A, NFT B).

### 6.1 NFT Collection Fields (Database Layer)

These fields exist in the backend database and are used to build metadata JSON for each token.

| Field         | Type      | Description                               |
|--------------|-----------|-------------------------------------------|
| `id`         | int       | Internal collection ID                    |
| `short_name` | string    | Short identifier (e.g. `A`, `GOLD`)       |
| `name`       | string    | Display name                              |
| `bcc_reward` | decimal   | Amount of BCC rewarded (business logic)   |
| `description`| text      | Rich text description                     |
| `image_url`  | string    | Image used for NFT metadata               |
| `active`     | boolean   | Whether new mints are allowed             |
| `max_supply` | int       | Total number of NFTs allowed for this set |
| `minted`     | int       | Number of NFTs already minted             |

> Note: Supply constraints are also enforced on-chain (see NFT contract).

### 6.2 Sample Admin Flows

- **Create Collection**
  - Master/Operation admin fills:
    - `short_name`, `name`, `bcc_reward`, `description`, `image_url`, `max_supply`
  - Backend:
    - Saves collection to DB
    - Calls `createCollection(shortName, maxSupply, active)` on NFT contract

- **Mint NFTs**
  - Admin selects collection + target wallet(s) + quantity
  - Backend:
    - Verifies `minted + quantity <= max_supply`
    - Calls `mintCollection(to, collectionId, quantity)` on NFT contract
    - Updates `minted` in DB

---

## 7. News Management (Multilingual)

Admins can manage **company news** articles that are displayed to members in the "News" section of the member dashboard/app.

### 7.1 Features

- CRUD for company news articles
- Multi-language support with tabs in admin UI:
  - EN, CN, JP, MS (example)
- Status fields: `draft`, `published`, `archived`
- News articles are displayed to members when they log in
- Members can view company updates, announcements, and important information

### 7.2 Data Model (Simplified)

```json
{
  "id": 1,
  "slug": "membership-update",
  "status": "published",
  "translations": {
    "en": { "title": "Membership Update", "content": "..." },
    "cn": { "title": "会员更新", "content": "..." },
    "jp": { "title": "メンバーシップ更新", "content": "..." },
    "ms": { "title": "Kemaskini Keahlian", "content": "..." }
  }
}
```

Operations are gated by permissions:
- Create: `news.create`
- Update: `news.update`
- Delete: `news.delete`
- Multi-language fields: `news.multilingual`

---

## 8. Education / Class Management

Used for classes, training, webinars, etc.

### 8.1 Class Fields

| Field        | Description                   |
|--------------|-------------------------------|
| `id`         | Class ID                      |
| `title`      | Class title                   |
| `description`| Rich text description         |
| `thumbnail`  | Image URL                     |
| `category`   | Optional category             |
| `active`     | Whether visible to users      |

### 8.2 Meetings per Class

Each class can have multiple meeting sessions.

| Field             | Description                         |
|-------------------|-------------------------------------|
| `id`              | Meeting ID                          |
| `class_id`        | Parent class                        |
| `meeting_title`   | Meeting title                       |
| `meeting_time`    | Datetime                            |
| `meeting_url`     | Zoom/Meet/custom URL                |
| `meeting_password`| Auto-generated 6-digit password     |
| `meeting_image`   | Optional image/thumbnail            |

### 8.3 Password Generation (Backend)

```ts
function generateMeetingPassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

Permissions:
- `class.create`, `class.update`, `class.delete`, `class.manage_meetings`

---

## 9. Merchant & Merchant Ads Management

### 9.1 Merchant (CRUD)

| Field          | Description                       |
|----------------|-----------------------------------|
| `id`           | Merchant ID                       |
| `merchant_name`| Display name                      |
| `logo_url`     | Logo image                        |
| `description`  | Rich text                         |
| `location`     | Optional location string          |
| `contact_info` | Optional contact details          |
| `merchant_page_url` | Link to merchant's dedicated page/website |
| `active`       | Whether shown to users            |

**Note**: Merchants are displayed to members in the "Discover" section with links to their pages.

Permissions: `merchant.create`, `merchant.update`, `merchant.delete`

### 9.2 Merchant Ads (CRUD)

| Field         | Description                       |
|---------------|-----------------------------------|
| `id`          | Ad ID                             |
| `merchant_id` | FK to merchant                    |
| `image_url`   | Banner image                      |
| `redirect_url`| Link when user clicks             |
| `active`      | Whether shown in app              |

Permissions: `merchant_ads.create`, `merchant_ads.update`, `merchant_ads.delete`

### 9.3 Discover Section (Member-Facing)

The **Discover** section is displayed to members when they log in. It shows all active merchants with their details and links to their merchant pages.

#### 9.3.1 Discover Features

- **Merchant List Display**
  - Shows all active merchants to logged-in members
  - Displays merchant logo, name, description, and location
  - Each merchant card includes a link/button to visit the merchant's page

- **Merchant Page Links**
  - Each merchant has a `merchant_page_url` field that links to their dedicated page
  - Links can be:
    - External website URLs
    - Internal merchant detail pages
    - Custom landing pages

- **Merchant Details**
  - Members can view:
    - Merchant name and logo
    - Description
    - Location (if provided)
    - Contact information (if provided)
    - Link to merchant's page/website

#### 9.3.2 Discover UI Flow

1. **Member logs in** → Sees "News" and "Discover" sections
2. **News Section**: Shows company news articles (from News Management)
3. **Discover Section**: Shows all active merchants
4. **Member clicks merchant** → Redirects to merchant's page URL or opens merchant detail page

#### 9.3.3 API Endpoints (Pseudo-code)

```ts
// Get all active merchants for Discover section
GET /api/members/merchants

Response:
{
  "merchants": [
    {
      "id": 1,
      "merchant_name": "Example Merchant",
      "logo_url": "https://example.com/logo.png",
      "description": "Merchant description...",
      "location": "Kuala Lumpur, Malaysia",
      "contact_info": "contact@merchant.com",
      "merchant_page_url": "https://merchant-page.com",
      "active": true
    }
  ]
}

// Get single merchant details
GET /api/members/merchants/:id
```

#### 9.3.4 Member Experience

- **Discover Section Layout**
  - Grid or list view of merchant cards
  - Each card shows:
    - Merchant logo
    - Merchant name
    - Brief description (truncated)
    - Location badge (if available)
    - "Visit Page" or "Learn More" button/link

- **Merchant Interaction**
  - Clicking merchant card or "Visit Page" button:
    - Opens merchant page URL in new tab (if external)
    - Navigates to merchant detail page (if internal)
    - Tracks merchant page views for analytics

---

## 10. Purchase Field Configuration

Admin can configure which fields users must fill before purchasing an NFT.

### 10.1 Default Fields

- `name` (required)
- `email` (required)
- `phone` (required)

### 10.2 Custom Fields (Admin-Configurable)

Admin can add fields such as:

- `wallet_address` (to enforce wallet address input)
- `country`
- `telegram_id`
- `national_id`

Each field definition:

```json
{
  "key": "wallet_address",
  "label": "Wallet Address",
  "type": "text",
  "required": true
}
```

These are stored in DB (e.g. `purchase_field_config` table) and enforced by the frontend before calling purchase APIs.

Permission required: `purchase_fields.update`.

---

## 11. Activity Log System

All key actions must be logged, both for users and admins.

### 11.1 Log Structure

```json
{
  "id": 123,
  "actor_type": "user | admin",
  "actor_id": "0xUserWallet or admin_id",
  "action": "purchase_nft",
  "metadata": { "level": 3, "amount": "50 USDT" },
  "timestamp": "2025-01-01T09:30:00Z"
}
```

### 11.2 Examples of Logged Actions

**User events:**
- `user.register` - User registers new account
- `user.register_with_referral` - User registers using a referral link
- `user.login` - User logs into the platform
- `user.purchase_nft` - User purchases NFT/membership
- `user.upgrade_membership` - User upgrades membership level
- `user.claim_rewards` - User claims BCC rewards
- `user.referred_new_user` - User successfully referred a new member
- `user.wallet_connected` - User connects wallet (triggers referral code generation)

**Admin events:**
- `admin.login` - Admin logs into admin panel
- `admin.create_admin` - Master Admin creates new admin account
- `admin.update_admin` - Master Admin updates admin account
- `admin.delete_admin` - Master Admin deletes admin account
- `admin.bulk_import_user` - Admin imports single user via bulk import
- `admin.bulk_import_complete` - Admin completes bulk import batch
- `admin.create_nft_collection` - Admin creates new NFT collection
- `admin.mint_nft` - Admin mints NFT to user
- `admin.update_news` - Admin updates news article
- `admin.update_purchase_fields` - Admin updates purchase field configuration
- `admin.update_permissions` - Admin updates role permissions
- `admin.request_address_change` - Admin requests member address modification
- `admin.approve_address_change` - Master Admin approves address change
- `admin.reject_address_change` - Master Admin rejects address change

Permissions to view/export logs:
- `logs.view`, `logs.export`

---

## 12. Beehive NFT Smart Contract (ERC‑721, Off-Chain Metadata)

### 12.1 Design Summary

- Standard: **ERC‑721**
- Each token belongs to a **collection** (e.g. NFT A, NFT B).
- On-chain we store:
  - `shortName` per collection
  - `maxSupply` per collection
  - `minted` count per collection
  - `tokenCollection[tokenId]` (which collection a token belongs to)
- Admin functions:
  - `createCollection(shortName, maxSupply, active)`
  - `setCollectionActive(collectionId, active)`
  - `setBaseURI(baseURI)`
  - `mintCollection(to, collectionId, quantity)`

**Business rule example:**
- Admin creates NFT A with `maxSupply = 1000`
- Over time, admin mints up to 1000 NFTs in that collection to users.
- No per-user limits enforced on-chain.

### 12.2 Solidity Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BeehiveNFT
 * @notice ERC-721 NFT contract with collection-based supply control.
 *         Metadata is served off-chain via baseURI.
 *
 *         - Admin (owner) can create collections with:
 *              * shortName (e.g. "A", "GOLD")
 *              * maxSupply (e.g. 1000)
 *              * active flag
 *         - Admin can mint NFTs from a collection up to its maxSupply.
 *         - Each tokenId is mapped to a collectionId.
 */
contract BeehiveNFT is ERC721, Ownable {
    using Counters for Counters.Counter;

    struct Collection {
        string shortName;   // short identifier, e.g. "A", "GOLD"
        uint256 maxSupply;  // maximum tokens that can be minted for this collection
        uint256 minted;     // number of tokens already minted
        bool active;        // whether minting is allowed
    }

    Counters.Counter private _tokenIdCounter;
    uint256 public nextCollectionId;

    // collectionId => Collection
    mapping(uint256 => Collection) public collections;

    // tokenId => collectionId
    mapping(uint256 => uint256) public tokenCollection;

    string private _baseTokenURI;

    event CollectionCreated(
        uint256 indexed collectionId,
        string shortName,
        uint256 maxSupply,
        bool active
    );

    event CollectionStatusUpdated(
        uint256 indexed collectionId,
        bool active
    );

    event BaseURIUpdated(string newBaseURI);

    event CollectionMinted(
        uint256 indexed collectionId,
        address indexed to,
        uint256 quantity
    );

    constructor(string memory baseURI) ERC721("Beehive NFT", "BHNFT") {
        _baseTokenURI = baseURI;
        nextCollectionId = 1;
    }

    // -----------------------------
    // Admin-only functions
    // -----------------------------

    /**
     * @notice Create a new NFT collection.
     * @param shortName Short identifier for the collection (e.g. "A").
     * @param maxSupply Maximum supply for this collection (must be > 0).
     * @param active Whether the collection is initially active.
     */
    function createCollection(
        string calldata shortName,
        uint256 maxSupply,
        bool active
    ) external onlyOwner returns (uint256) {
        require(bytes(shortName).length > 0, "Short name required");
        require(maxSupply > 0, "Max supply must be > 0");

        uint256 collectionId = nextCollectionId;
        nextCollectionId += 1;

        collections[collectionId] = Collection({
            shortName: shortName,
            maxSupply: maxSupply,
            minted: 0,
            active: active
        });

        emit CollectionCreated(collectionId, shortName, maxSupply, active);
        return collectionId;
    }

    /**
     * @notice Enable or disable a collection.
     */
    function setCollectionActive(uint256 collectionId, bool active) external onlyOwner {
        Collection storage col = collections[collectionId];
        require(bytes(col.shortName).length > 0, "Collection does not exist");

        col.active = active;
        emit CollectionStatusUpdated(collectionId, active);
    }

    /**
     * @notice Set the base URI for metadata.
     */
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @notice Mint multiple NFTs from a collection to a single address.
     * @dev Only callable by the owner (admin / backend).
     */
    function mintCollection(
        address to,
        uint256 collectionId,
        uint256 quantity
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(quantity > 0, "Quantity must be > 0");

        Collection storage col = collections[collectionId];
        require(bytes(col.shortName).length > 0, "Collection does not exist");
        require(col.active, "Collection is not active");
        require(col.minted + quantity <= col.maxSupply, "Exceeds collection supply");

        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter.increment();
            uint256 tokenId = _tokenIdCounter.current();

            _safeMint(to, tokenId);
            tokenCollection[tokenId] = collectionId;
            col.minted += 1;
        }

        emit CollectionMinted(collectionId, to, quantity);
    }

    // -----------------------------
    // View functions
    // -----------------------------

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Returns the collection data for a given tokenId.
     */
    function getTokenCollection(uint256 tokenId) external view returns (Collection memory) {
        uint256 collectionId = tokenCollection[tokenId];
        require(collectionId != 0, "Token has no collection");
        return collections[collectionId];
    }
}
```

### 12.3 Notes for Integration

- The backend stores full metadata (name, description, image, BCC reward, etc.) per collection.
- When building `tokenURI`, the metadata server can use:
  - `tokenId`
  - `tokenCollection[tokenId]`
  - Collection `shortName`
- Example metadata URL pattern:
  - `https://api.beehive.io/nft/metadata/{tokenId}`

Admin-side operations:

1. Create collection in DB and on-chain:
   - DB: insert `short_name`, `name`, `description`, `image_url`, `max_supply`.
   - Chain: call `createCollection(shortName, maxSupply, true)`.
2. Mint NFTs:
   - Backend checks DB `minted + quantity <= max_supply`.
   - Calls `mintCollection(to, collectionId, quantity)`.
   - Updates DB `minted` count.
3. Users can view NFTs in their wallet as standard ERC‑721 tokens.

---

## 13. QA Checklist

- [ ] Admin roles and permissions saved and enforced.
- [ ] Admin dashboard displays all required metrics (users, revenue, rewards, NFTs, transactions, system health).
- [ ] Dashboard metrics update in real-time or with appropriate caching.
- [ ] Dashboard supports time range selection and data export.
- [ ] Master Admin can create, read, update, and delete other admin accounts.
- [ ] Normal admins cannot modify other admin accounts.
- [ ] User list is viewable by all admins with proper permissions.
- [ ] Admins can bulk import users from CSV/Excel files.
- [ ] Bulk imported users are automatically registered as Level 1 members without payment.
- [ ] Referral codes are auto-generated when users connect their wallet and saved in database.
- [ ] Member IDs are auto-generated and linked to referral codes.
- [ ] Referral links work correctly and auto-fill referral codes in registration form.
- [ ] Sponsor relationships are automatically established when users register via referral link.
- [ ] Normal admins can request member address modifications.
- [ ] Address modification requests require Master Admin approval.
- [ ] Address changes update all related records (NFTs, rewards, transactions).
- [ ] NFT collections can be created, read, updated (status), and used for minting.
- [ ] News module supports multiple languages via tabs.
- [ ] Company news articles are displayed to members in the "News" section when they log in.
- [ ] Discover section displays all active merchants to logged-in members.
- [ ] Merchant page URLs work correctly and link to merchant pages/websites.
- [ ] Members can view merchant details (name, logo, description, location, contact) in Discover section.
- [ ] Classes and meetings can be created, with auto-generated 6-digit passwords.
- [ ] Merchants and merchant ads can be managed via admin.
- [ ] Purchase field configuration is respected by frontend.
- [ ] Activity logs are recorded for all key actions (user and admin), including address modification requests and approvals.
- [ ] NFT contract deployed and wired to backend admin features.
- [ ] Base URI points to a live metadata API.
