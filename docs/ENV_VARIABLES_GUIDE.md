# 🔧 Environment Variables Guide

## 📍 Where to Put `.env` Files

You have **two options** for managing environment variables:

### Option 1: Root-Level `.env` (Recommended) ✅

**Location**: `.env` in the project root directory

**Pros:**
- ✅ Single file to manage
- ✅ Shared variables for all apps
- ✅ Easier to maintain
- ✅ Works with pnpm workspaces

**How it works:**
- Node.js automatically loads `.env` from the current working directory
- When you run `pnpm dev` from root, it loads root `.env`
- When you run `pnpm dev` from `apps/api`, it can still access root `.env` if you're in the workspace

**Create it:**
```bash
# Copy the example file
copy .env.example .env

# Or create manually
New-Item -Path ".env" -ItemType File
```

### Option 2: App-Specific `.env` Files

**Locations:**
- `apps/api/.env` - API-specific variables
- `apps/web/.env` - Web-specific variables

**Pros:**
- ✅ Isolated configuration per app
- ✅ Better for different environments

**Cons:**
- ❌ Need to maintain multiple files
- ❌ Duplicate shared variables

---

## 🔄 How Environment Variables Are Loaded

### For API (`apps/api`)

The API uses Node.js `process.env`, which automatically loads:
1. System environment variables
2. `.env` file in the current working directory
3. `.env` file in `apps/api/` directory (if running from there)

**Example:**
```typescript
// apps/api/src/db/index.ts
const connectionString = process.env.DATABASE_URL || "mysql://...";
```

### For Web (`apps/web`)

Next.js has special rules:
- **Server-side**: Uses `process.env.*` (any variable)
- **Client-side**: Only `NEXT_PUBLIC_*` variables are exposed

**Example:**
```typescript
// ✅ Works on server AND client
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ Only works on server
const jwtSecret = process.env.JWT_SECRET; // Not available in browser!
```

---

## 📝 Root `.env` File Structure

Create `.env` in the root directory:

```env
# Database (XAMPP MySQL)
DATABASE_URL=mysql://root:@localhost:3306/beehive

# Redis (Local)
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-secret-key

# API
API_PORT=4000
NODE_ENV=development

# Frontend (Next.js - requires NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_WALLET_CONNECT_ID=your-project-id

# Contracts (update after deployment)
NEXT_PUBLIC_MEMBERSHIP_CONTRACT=0x...
NEXT_PUBLIC_REWARDS_CONTRACT=0x...
NEXT_PUBLIC_BCC_TOKEN_CONTRACT=0x...
NEXT_PUBLIC_USDT_CONTRACT=0x...
```

---

## 🎯 Quick Setup

### Step 1: Create Root `.env`

```bash
# Windows PowerShell
copy .env.example .env

# Or manually create .env in root directory
```

### Step 2: Edit `.env`

Open `.env` and update with your values:
- XAMPP MySQL connection string
- Redis URL
- JWT secret
- Wallet Connect ID (if needed)

### Step 3: Verify

**Test API:**
```bash
cd apps/api
node -e "console.log(process.env.DATABASE_URL)"
# Should print: mysql://root:@localhost:3306/beehive
```

**Test Web:**
```bash
cd apps/web
node -e "console.log(process.env.NEXT_PUBLIC_API_URL)"
# Should print: http://localhost:4000
```

---

## 🔐 Security Notes

### ✅ Safe to Commit
- `.env.example` - Template file (no secrets)
- `apps/api/.env.example` - Template file

### ❌ Never Commit
- `.env` - Contains secrets
- `apps/api/.env` - Contains secrets
- `apps/web/.env` - Contains secrets

**Make sure `.gitignore` includes:**
```
.env
.env.local
.env.*.local
```

---

## 🔄 Variable Priority

When multiple `.env` files exist, priority is:

1. **System environment variables** (highest priority)
2. **App-specific `.env`** (e.g., `apps/api/.env`)
3. **Root `.env`** (e.g., `.env` in root)
4. **Default values in code** (lowest priority)

**Example:**
```typescript
// If DATABASE_URL exists in:
// 1. System env → uses that
// 2. apps/api/.env → uses that
// 3. Root .env → uses that
// 4. Code default → uses "mysql://beehive:password@localhost:3306/beehive"

const dbUrl = process.env.DATABASE_URL || "mysql://beehive:password@localhost:3306/beehive";
```

---

## 📚 Common Variables

### Database (XAMPP)
```env
# Default XAMPP (no password)
DATABASE_URL=mysql://root:@localhost:3306/beehive

# Custom user
DATABASE_URL=mysql://beehive:password@localhost:3306/beehive
```

### Redis
```env
# Local Redis/Memurai
REDIS_URL=redis://localhost:6379

# Docker Redis
REDIS_URL=redis://localhost:6379

# WSL Redis
REDIS_URL=redis://localhost:6379
```

### API
```env
API_PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_WALLET_CONNECT_ID=your-project-id
```

---

## 🐛 Troubleshooting

### Variables Not Loading?

1. **Check file location:**
   - Root `.env` should be in: `C:\Users\User\Desktop\Website\beehive\.env`
   - API `.env` should be in: `C:\Users\User\Desktop\Website\beehive\apps\api\.env`

2. **Restart dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Start again
   pnpm dev
   ```

3. **Check variable names:**
   - Case-sensitive: `DATABASE_URL` not `database_url`
   - No spaces: `DATABASE_URL=value` not `DATABASE_URL = value`

4. **Verify in code:**
   ```typescript
   console.log("DATABASE_URL:", process.env.DATABASE_URL);
   ```

### Next.js Variables Not Working?

- **Client-side variables** MUST have `NEXT_PUBLIC_` prefix
- **Server-side variables** can be any name
- **Restart Next.js** after changing `.env`

---

## ✅ Best Practices

1. **Use root `.env`** for shared variables (database, redis, etc.)
2. **Use app-specific `.env`** only if you need different values per app
3. **Never commit `.env`** files to git
4. **Use `.env.example`** as a template
5. **Document** all required variables
6. **Use strong secrets** in production
7. **Restart servers** after changing `.env`

---

## 🎊 Summary

**Yes, you can use a root `.env` file!** ✅

1. Create `.env` in the root directory
2. Add all your variables there
3. Both API and Web will read from it
4. For Next.js client-side, use `NEXT_PUBLIC_` prefix

**Quick Start:**
```bash
copy .env.example .env
# Edit .env with your values
pnpm dev
```

That's it! 🚀

