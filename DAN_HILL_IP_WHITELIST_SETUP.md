# 🔧 Dan Hill IP Whitelist Setup

## Issue
Dan Hill is being blocked by IP whitelist at IP address: **145.224.65.166**

## Solution Options

### Option 1: Add via Railway Database (RECOMMENDED)

1. **Go to Railway Dashboard**:
   - Open: https://railway.app
   - Select your Omnivox project
   - Click on **PostgreSQL** service

2. **Open PostgreSQL Query**:
   - Click **"Query"** tab or **"Data"** tab
   - Look for option to run SQL query

3. **Execute this SQL**:
   ```sql
   INSERT INTO public."IPWhitelist" (
     "ipAddress", 
     "userId", 
     "description", 
     "isActive", 
     "createdAt", 
     "lastUsedAt"
   ) VALUES (
     '145.224.65.166', 
     NULL, 
     'Dan Hill - Agent access', 
     true, 
     NOW(), 
     NOW()
   );
   ```

4. **Verify**:
   ```sql
   SELECT * FROM public."IPWhitelist" WHERE "ipAddress" = '145.224.65.166';
   ```

### Option 2: Add via API Script

1. **Get Admin Token**:
   - Log into Omnivox as admin
   - Open DevTools (F12) → Application → Local Storage
   - Copy the `omnivox_token` value

2. **Run Script**:
   ```bash
   cd /Users/zenan/kennex
   ADMIN_TOKEN="<your-token-here>" node add-dan-hill-ip.js
   ```

### Option 3: Add via Admin Panel (If Available)

1. **Login to Omnivox Admin**:
   - Go to: https://omnivox.vercel.app/admin

2. **Navigate to IP Whitelist**:
   - Admin → Security → IP Whitelist
   - Click "Add IP"

3. **Fill in Details**:
   - IP Address: `145.224.65.166`
   - Description: `Dan Hill - Agent access`
   - User: Select "Dan Hill" if available
   - Status: Active ✅

4. **Save**

## Verification

After adding the IP, Dan Hill should be able to:
1. **Login** to Omnivox without IP restriction errors
2. **Access** all agent features
3. **Make** and receive calls
4. **Save** dispositions and call data

## Current IP Whitelist Status

To check existing whitelisted IPs:
```sql
SELECT "ipAddress", "description", "isActive", "lastUsedAt" 
FROM public."IPWhitelist" 
ORDER BY "createdAt" DESC;
```

## Remove IP (If Needed)

If you need to remove this IP later:
```sql
DELETE FROM public."IPWhitelist" WHERE "ipAddress" = '145.224.65.166';
```

Or deactivate:
```sql
UPDATE public."IPWhitelist" 
SET "isActive" = false 
WHERE "ipAddress" = '145.224.65.166';
```

## Notes

- **IP Address**: 145.224.65.166
- **User**: Dan Hill (Agent)
- **Purpose**: Allow agent access from this IP
- **Security**: Only this specific IP will be allowed
- **Status**: Must be active for access

---

**Action Required**: Execute SQL in Railway PostgreSQL or run the add-dan-hill-ip.js script with admin token.
