# Beehive Admin System - Quick Start Guide

## 🎉 What's Been Built

### ✅ Database Schema (Complete)
All tables have been created in `apps/api/src/db/schema.ts`:
- Extended users table with referral system fields
- Admin system tables (roles, permissions, admins)
- Bulk import system
- Referral relationships
- Address modification requests
- News management (multilingual)
- Merchants and discover
- Classes and meetings
- Activity logs
- Dashboard metrics
- NFT collections

### ✅ Backend API (Partial)
**Completed:**
- Admin authentication (`/api/admin/auth/login`, `/api/admin/auth/me`)
- User management (`/api/admin/users/*`)
- Bulk import endpoint (`/api/admin/users/bulk-import`)
- Activity logging system
- Permission-based access control

**Utilities Created:**
- `apps/api/src/middleware/adminAuth.ts` - JWT auth & permission checking
- `apps/api/src/utils/activityLogger.ts` - Activity logging
- `apps/api/src/utils/referralCode.ts` - Referral code generation
- `apps/api/src/utils/csvParser.ts` - CSV/Excel parsing

### ✅ Frontend (Partial)
- Admin login page (`/admin/login`)
- Admin link in footer
- Responsive design with Tailwind CSS

### ✅ Seed Data
- Seed script created (`apps/api/src/scripts/seed.ts`)
- Creates Master Admin, Operation, and Support roles
- Creates default admin users

## 🚀 Getting Started

### 1. Start Docker Services
```bash
# Make sure Docker Desktop is running, then:
docker-compose up -d
```

### 2. Push Database Schema
```bash
cd apps/api
pnpm db:push
```

### 3. Seed Database
```bash
pnpm db:seed
```

This will create:
- **Master Admin**: admin@beehive.io / admin123
- **Operation Admin**: operation@beehive.io / operation123

### 4. Start API Server
```bash
pnpm dev
```

API will run on http://localhost:4000

### 5. Start Web App
```bash
cd ../web
pnpm dev
```

Web app will run on http://localhost:3000

### 6. Access Admin Panel
1. Go to http://localhost:3000
2. Scroll to footer and click "Admin"
3. Login with: admin@beehive.io / admin123

## 📁 Project Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── db/
│   │   │   └── schema.ts              # All database tables
│   │   ├── middleware/
│   │   │   └── adminAuth.ts           # Admin authentication
│   │   ├── routes/
│   │   │   ├── admin/
│   │   │   │   ├── auth.ts            # Admin login
│   │   │   │   └── users.ts           # User management
│   │   │   └── admin.ts               # Main admin routes
│   │   ├── utils/
│   │   │   ├── activityLogger.ts      # Activity logging
│   │   │   ├── referralCode.ts        # Referral code utils
│   │   │   └── csvParser.ts           # CSV/Excel parsing
│   │   └── scripts/
│   │       └── seed.ts                # Database seeding
│   └── package.json
└── web/
    └── src/
        ├── app/
        │   └── admin/
        │       └── login/
        │           └── page.tsx       # Admin login page
        └── components/
            └── layout/
                └── Footer.tsx         # Footer with admin link
```

## 🔑 Admin Roles & Permissions

### Master Admin
- Full access to everything
- Can manage other admins
- Can approve address modifications

### Operation Admin
- User management (list, view, bulk import)
- NFT management
- News management
- Merchant management
- Classes management
- Cannot manage other admins

### Support Admin
- User list and view only
- Can request address modifications (requires master admin approval)
- View activity logs

## 📋 Next Steps

### High Priority
1. **Create Admin Dashboard** (`/admin/dashboard`)
   - Display metrics (users, revenue, rewards)
   - Charts and graphs
   - Recent activity feed

2. **Build User Management UI** (`/admin/users`)
   - List users with search and filters
   - View user details
   - Bulk import interface

3. **Implement Referral System**
   - Auto-generate referral codes on wallet connect
   - Registration with referral code
   - Referral link display in member dashboard

4. **Build News Management** (`/admin/news`)
   - Create/edit/delete news articles
   - Multilingual support
   - Publish/draft/archive status

5. **Build Discover Section**
   - Merchant management UI
   - Member-facing discover page
   - Merchant detail pages

### API Endpoints Needed
- Dashboard metrics endpoints
- News CRUD endpoints
- Merchant CRUD endpoints
- Referral system endpoints
- Address modification workflow endpoints
- NFT collection management endpoints

### Frontend Components Needed
- Admin dashboard with charts
- User management interface
- Bulk import UI with drag-drop
- News management interface
- Merchant management interface
- Member news section
- Member discover section
- Referral link component

## 🧪 Testing

### Test Admin Login
1. Go to http://localhost:3000/admin/login
2. Use credentials: admin@beehive.io / admin123
3. Should redirect to dashboard (to be built)

### Test Bulk Import
```bash
# Create a test CSV file (users.csv):
wallet_address,email,name
0x1234567890123456789012345678901234567890,user1@test.com,User One
0x2345678901234567890123456789012345678901,user2@test.com,User Two

# Upload via API:
curl -X POST http://localhost:4000/api/admin/users/bulk-import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@users.csv"
```

### Test Activity Logs
All admin actions are automatically logged to the `activity_logs` table.

## 📚 Documentation

- **Full Spec**: `docs/beehive_admin_nft_spec.md`
- **Implementation Progress**: `docs/IMPLEMENTATION_PROGRESS.md`
- **Local Setup**: `docs/LOCAL_SETUP_GUIDE.md`

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if MySQL is running
docker ps | grep mysql

# Restart Docker containers
docker-compose restart
```

### API Not Starting
```bash
# Check environment variables
cat .env

# Make sure JWT_SECRET is set
# Make sure DATABASE_URL is correct
```

### Frontend Build Errors
```bash
# Clear Next.js cache
cd apps/web
rm -rf .next
pnpm dev
```

## 🔐 Security Notes

⚠️ **IMPORTANT**: Change default admin passwords in production!

```sql
-- Update admin password (hash with bcrypt first)
UPDATE admins SET password_hash = 'NEW_HASH' WHERE email = 'admin@beehive.io';
```

## 📞 Support

For issues or questions, refer to:
1. `docs/beehive_admin_nft_spec.md` - Complete specification
2. `docs/IMPLEMENTATION_PROGRESS.md` - What's done and what's next
3. Code comments in source files

