# Troubleshooting 500 Internal Server Error (Admin Login)

## Problem
Getting 500 Internal Server Error when trying to log in to admin panel.

## Common Causes

### 1. Database Tables Don't Exist

The admin login requires these tables:
- `admins`
- `admin_roles`
- `admin_permissions`
- `activity_logs`

**Check:**
```bash
# Connect to MySQL
mysql -u beehive_user -p beehive

# Check if tables exist
SHOW TABLES LIKE 'admins';
SHOW TABLES LIKE 'admin_roles';
SHOW TABLES LIKE 'admin_permissions';
SHOW TABLES LIKE 'activity_logs';
```

**Fix:**
```bash
cd /root/projects/beehive/apps/api
pnpm db:push
```

### 2. No Admin Users in Database

**Check:**
```bash
mysql -u beehive_user -p beehive -e "SELECT * FROM admins;"
```

**Fix - Run Seed Script:**
```bash
cd /root/projects/beehive/apps/api
pnpm db:seed
```

This will create:
- Master Admin: `admin@beehive.io` / `admin123`
- Operation Admin: `operation@beehive.io` / `operation123`

### 3. Database Connection Issue

**Check API logs:**
```bash
pm2 logs beehive-api --lines 50
```

Look for database connection errors.

**Test database connection:**
```bash
mysql -u beehive_user -p beehive -e "SELECT 1;"
```

**Check .env file:**
```bash
cd /root/projects/beehive
grep DATABASE_URL .env
```

Should be:
```
DATABASE_URL=mysql://beehive_user:920214%40Ang@localhost:3306/beehive
```

### 4. Missing Dependencies

**Check if bcryptjs is installed:**
```bash
cd /root/projects/beehive/apps/api
pnpm list bcryptjs
```

**If missing, install:**
```bash
pnpm install bcryptjs
pnpm build
pm2 restart beehive-api
```

### 5. JWT Secret Not Set

**Check:**
```bash
grep JWT_SECRET /root/projects/beehive/.env
```

**If not set, add:**
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> /root/projects/beehive/.env
pm2 restart beehive-api
```

## Quick Fix Steps

```bash
# 1. Check API logs for actual error
pm2 logs beehive-api --lines 100

# 2. Verify database connection
mysql -u beehive_user -p beehive -e "SELECT 1;"

# 3. Check if tables exist
mysql -u beehive_user -p beehive -e "SHOW TABLES;"

# 4. If tables missing, push schema
cd /root/projects/beehive/apps/api
pnpm db:push

# 5. If no admin users, run seed
pnpm db:seed

# 6. Restart API
pm2 restart beehive-api

# 7. Check logs again
pm2 logs beehive-api --lines 20
```

## Verify Everything is Working

```bash
# 1. Check if admin user exists
mysql -u beehive_user -p beehive -e "SELECT email, name, active FROM admins;"

# 2. Test API health endpoint
curl http://localhost:4001/api/health

# 3. Test admin login endpoint (should return 400, not 500)
curl -X POST http://localhost:4001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@beehive.io","password":"admin123"}'
```

## Expected Response (Success)

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "admin": {
      "id": 1,
      "email": "admin@beehive.io",
      "name": "Master Administrator",
      "roleId": 1,
      "roleName": "Master Admin",
      "isMasterAdmin": true,
      "permissions": [...]
    }
  }
}
```

## Expected Response (Error - Wrong Credentials)

```json
{
  "error": "Invalid credentials"
}
```

If you get 500 instead of 401, there's a server error. Check the API logs.

