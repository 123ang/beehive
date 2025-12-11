# Create Admin Users - Quick Guide

## Quick Start

Run this command on your VPS:

```bash
cd /root/projects/beehive/apps/api
node scripts/createAdmin.js
```

The script will use these default credentials:
- User: `beehive_user`
- Password: `920214@Ang`
- Host: `localhost`
- Database: `beehive`

## What It Creates

1. **Master Admin Role** - Full access
2. **Operation Role** - Operations permissions
3. **Support Role** - Support permissions
4. **Master Admin User**
   - Email: `admin@beehive.io`
   - Password: `admin123`
5. **Operation Admin User**
   - Email: `operation@beehive.io`
   - Password: `operation123`

## Custom Credentials

If you need to use different credentials:

```bash
node scripts/createAdmin.js \
  --user=your_username \
  --password=your_password \
  --host=localhost \
  --database=beehive
```

## Verify It Worked

```bash
mysql -u beehive_user -p920214@Ang beehive -e "SELECT email, name, active FROM admins;"
```

## Troubleshooting

### "Access denied for user"
- Check username and password are correct
- Make sure the user has permissions on the `beehive` database

### "Table doesn't exist"
- Run `pnpm db:push` first to create tables

### "Cannot find module"
- Run `pnpm install` in the `apps/api` directory
