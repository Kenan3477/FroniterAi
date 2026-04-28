# Dan Hill Account & IP Whitelist Check

## Run these SQL queries in Railway PostgreSQL Console:

### 1. Check if Dan Hill's user account exists:

```sql
-- Search for Dan Hill user
SELECT 
  "id", 
  "username", 
  "email", 
  "firstName", 
  "lastName", 
  "role", 
  "isActive",
  "createdAt",
  "lastLogin"
FROM public."User" 
WHERE 
  "firstName" ILIKE '%dan%' 
  OR "lastName" ILIKE '%hill%'
  OR "username" ILIKE '%dan%'
  OR "email" ILIKE '%dan%';
```

### 2. Check if IP 145.224.65.166 is whitelisted:

```sql
-- Check Dan Hill's IP whitelist entry
SELECT * 
FROM public."IPWhitelist" 
WHERE "ipAddress" = '145.224.65.166';
```

### 3. View ALL whitelisted IPs:

```sql
-- See all whitelisted IPs
SELECT 
  "ipAddress", 
  "name", 
  "description", 
  "isActive", 
  "activityCount",
  "addedAt"
FROM public."IPWhitelist" 
WHERE "isActive" = true
ORDER BY "addedAt" DESC;
```

---

## Expected Results:

### ✅ IF Dan Hill's Account EXISTS and is ACTIVE:
- You'll see a user record with `"isActive" = true`
- Dan Hill should be able to login with his credentials

### ❌ IF Dan Hill's Account DOES NOT EXIST:
- Query returns no rows
- **ACTION REQUIRED:** Create Dan Hill's account

### ❌ IF Dan Hill's Account is INACTIVE:
- You'll see `"isActive" = false`
- **ACTION REQUIRED:** Activate the account

---

## Fixes Based on Results:

### Fix 1: Create Dan Hill's Account (if doesn't exist):

**Option A: Use Admin Panel (RECOMMENDED)**
1. Login to Omnivox as admin
2. Go to: Admin → Users → Add User
3. Fill in:
   - Username: `dan.hill`
   - Email: `dan.hill@company.com`
   - Password: (set a password)
   - First Name: `Dan`
   - Last Name: `Hill`
   - Role: `AGENT`
   - Active: ✅ YES

**Option B: SQL (if admin panel unavailable)**
```sql
-- Generate a bcrypt password hash first (use https://bcrypt-generator.com/)
-- Then run:

INSERT INTO public."User" 
("id", "username", "email", "password", "firstName", "lastName", "role", "isActive", "createdAt", "updatedAt")
VALUES 
(gen_random_uuid(), 
 'dan.hill', 
 'dan.hill@company.com', 
 '$2a$10$YOUR_BCRYPT_HASHED_PASSWORD_HERE', 
 'Dan', 
 'Hill', 
 'AGENT', 
 true, 
 NOW(), 
 NOW());
```

### Fix 2: Activate Dan Hill's Account (if inactive):

```sql
-- Activate Dan Hill's account (replace ID with actual user ID from query above)
UPDATE public."User" 
SET "isActive" = true, "updatedAt" = NOW()
WHERE "id" = 'USER_ID_FROM_QUERY_ABOVE';
```

### Fix 3: Verify IP Whitelist (should already be done):

```sql
-- Check if IP exists
SELECT * FROM public."IPWhitelist" WHERE "ipAddress" = '145.224.65.166';

-- If NOT exists, add it:
INSERT INTO public."IPWhitelist" 
("ipAddress", "name", "description", "isActive", "createdAt", "activityCount") 
VALUES 
('145.224.65.166', 'Dan Hill', 'Agent access from office', true, NOW(), 0);

-- If exists but inactive, activate it:
UPDATE public."IPWhitelist" 
SET "isActive" = true 
WHERE "ipAddress" = '145.224.65.166';
```

---

## After Making Changes:

1. **Restart Railway Backend** (to reload IP whitelist cache)
2. **Have Dan Hill try to login again**
3. **Check browser console** for any JavaScript errors
4. **Clear browser cookies** if login still fails

---

## Most Likely Issues:

1. ❌ **Dan Hill's user account doesn't exist** → Create it
2. ❌ **Dan Hill's account is inactive** → Activate it  
3. ❌ **Dan Hill is using wrong credentials** → Reset password
4. ❌ **IP whitelist cache not refreshed** → Restart backend
5. ❌ **Browser cache/cookies** → Clear browser data

---

**Run the SQL queries above and let me know what you find!** 🎯
