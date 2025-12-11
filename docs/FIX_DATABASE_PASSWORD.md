# Fix Database Password Connection Issue

## Problem
Getting "Access denied for user 'beehive_user'@'localhost' (using password: YES)"

## Solution

The password `920214@Ang` contains an `@` symbol which must be URL-encoded as `%40` in the DATABASE_URL.

### Step 1: Update .env file

```bash
cd /root/projects/beehive
nano .env
```

Make sure the DATABASE_URL line is:

```env
DATABASE_URL=mysql://beehive_user:920214%40Ang@localhost:3306/beehive
```

**Important:** The `@` in the password must be `%40` (URL-encoded).

### Step 2: Test the connection

```bash
cd /root/projects/beehive/apps/api
node scripts/testDbConnection.js
```

This will show you:
- If the connection works
- What password is being used
- If the admins table exists

### Step 3: Verify MySQL user and password

```bash
# Test connection manually
mysql -u beehive_user -p920214@Ang beehive -e "SELECT 1;"
```

If this fails, the password might be wrong in MySQL. Check:

```bash
sudo mysql -u root -p
```

```sql
-- Check if user exists
SELECT user, host FROM mysql.user WHERE user='beehive_user';

-- If user doesn't exist or password is wrong, create/fix it:
CREATE USER IF NOT EXISTS 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Rebuild and restart API

```bash
cd /root/projects/beehive/apps/api
pnpm build
pm2 restart beehive-api
```

### Step 5: Check logs

```bash
pm2 logs beehive-api --lines 20
```

You should see:
```
🔌 Connecting to MySQL: beehive_user@localhost:3306/beehive
```

## Quick Fix Command

```bash
# Update .env file
cd /root/projects/beehive
sed -i 's|DATABASE_URL=.*|DATABASE_URL=mysql://beehive_user:920214%40Ang@localhost:3306/beehive|' .env

# Rebuild and restart
cd apps/api
pnpm build
pm2 restart beehive-api

# Test connection
node scripts/testDbConnection.js
```

