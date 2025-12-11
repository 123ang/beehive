# Verify and Fix MySQL User

## Problem
"Access denied for user 'beehive_user'@'localhost' (using password: YES)"

This means the MySQL user either doesn't exist or has the wrong password.

## Step 1: Check if User Exists

```bash
sudo mysql -u root -p
```

Then run:
```sql
SELECT user, host FROM mysql.user WHERE user='beehive_user';
```

## Step 2: If User Doesn't Exist, Create It

```sql
CREATE USER 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 3: If User Exists But Password is Wrong, Reset It

```sql
ALTER USER 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';
FLUSH PRIVILEGES;
EXIT;
```

## Step 4: Test Connection Manually

```bash
mysql -u beehive_user -p920214@Ang beehive -e "SELECT 1;"
```

If this works, the password is correct.

## Step 5: Verify Permissions

```bash
sudo mysql -u root -p
```

```sql
SHOW GRANTS FOR 'beehive_user'@'localhost';
```

Should show:
```
GRANT USAGE ON *.* TO 'beehive_user'@'localhost'
GRANT ALL PRIVILEGES ON `beehive`.* TO 'beehive_user'@'localhost'
```

If not, grant them:
```sql
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 6: Test Again

```bash
cd /root/projects/beehive/apps/api
node scripts/testDbConnection.js
```

## Quick Fix Script

Run this script to automatically create/fix the user:

```bash
cd /root/projects/beehive/apps/api
chmod +x scripts/fixMysqlUser.sh
./scripts/fixMysqlUser.sh
```

Or manually:

```bash
# If root has no password:
sudo mysql -u root << EOF
CREATE USER IF NOT EXISTS 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';
ALTER USER 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# If root has password:
sudo mysql -u root -p << EOF
CREATE USER IF NOT EXISTS 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';
ALTER USER 'beehive_user'@'localhost' IDENTIFIED BY '920214@Ang';
GRANT ALL PRIVILEGES ON beehive.* TO 'beehive_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

Then test:
```bash
mysql -u beehive_user -p920214@Ang beehive -e "SELECT 1;"
```

