# Admin Page Redirect Issue - Diagnostic & Fix

**Date:** April 22, 2026  
**Issue:** Admin tab redirects back to dashboard  
**Commit:** af01e23  
**Status:** INVESTIGATING

---

## 🔍 Issue Description

When visiting `/admin` page, it immediately redirects back to `/dashboard`.

---

## ✅ Verified Information

### 1. Database Check - User Role is CORRECT ✅
```
👤 ID: 509
   Username: ken
   Email: ken@simpleemails.co.uk
   Name: Kenan
   Role: ADMIN  ✅
   Active: true ✅
```

**Result:** Your user **DOES have ADMIN role** in the database.

---

### 2. Authorization Code Flow

The admin page (`frontend/src/app/admin/page.tsx`) does this:

```typescript
// 1. Calls /api/auth/profile to check user role
const response = await fetch('/api/auth/profile', {
  credentials: 'include'
});

// 2. Checks if user has ADMIN or SUPER_ADMIN role
if (data.user && (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN')) {
  setIsAuthorized(true);  // ✅ Allow access
} else {
  router.push('/dashboard?error=access-denied');  // ❌ Redirect
}
```

---

### 3. API Endpoint Chain

**Frontend API** (`/api/auth/profile`) → **Backend API** (`https://interchange.kennexai.com/api/auth/profile`)

**Frontend** (`frontend/src/app/api/auth/profile/route.ts`):
- Checks for `auth-token` cookie
- Forwards request to Railway backend with `Authorization: Bearer <token>`
- Returns backend response

**Backend** (`backend/src/routes/auth.ts`):
- Verifies JWT token
- Fetches user from database
- Returns user data with role

---

## 🐛 Possible Causes

### Cause 1: Auth Token Missing or Invalid
**Symptom:** No `auth-token` cookie in browser  
**Result:** Frontend returns 401, triggers redirect to `/login`

### Cause 2: JWT Token Expired
**Symptom:** Token exists but is expired  
**Result:** Backend returns 401, triggers redirect to `/login`

### Cause 3: Backend Not Returning `data.user` Structure
**Symptom:** Backend returns different response structure  
**Result:** `data.user` is undefined, triggers redirect to `/dashboard`

### Cause 4: Backend Timeout/Error
**Symptom:** Backend takes >5 seconds to respond  
**Result:** Frontend catches error, redirects to `/dashboard`

---

## 🔧 Diagnostic Steps

### Step 1: Open Browser Console
1. Open your browser
2. Press `F12` or `Cmd+Option+I` (Mac)
3. Go to **Console** tab
4. Clear console
5. Try to visit `/admin` page

### Step 2: Look for These Logs
You should see:

```
🔐 Checking admin access...
📡 Profile response status: 200
📦 Profile data: { success: true, user: { ... } }
✅ User has admin access: { id: 509, role: 'ADMIN', ... }
```

**If you see:**
```
🚫 User does not have admin role: undefined
🚫 Full data: { ... }
```
→ **Response structure is wrong**

**If you see:**
```
❌ Profile endpoint returned error: 401 Unauthorized
```
→ **Auth token is missing or invalid**

**If you see:**
```
❌ Profile endpoint returned error: 503 Service Unavailable
```
→ **Backend is timing out**

---

## 🚀 Quick Fixes

### Fix 1: Clear Browser Data and Re-login
```bash
# In browser:
1. Clear all cookies for app.kennexai.com
2. Go to /logout
3. Go to /login
4. Login again
5. Try /admin again
```

### Fix 2: Check Auth Token in Cookies
```bash
# In browser console:
document.cookie
  .split('; ')
  .find(row => row.startsWith('auth-token='))
```

**Expected:** `auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  
**If missing:** Re-login required

### Fix 3: Test Backend Directly
```bash
# Get your auth token from browser cookie, then:
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://interchange.kennexai.com/api/auth/profile
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 509,
      "username": "ken",
      "email": "ken@simpleemails.co.uk",
      "name": "Kenan",
      "role": "ADMIN",
      "isActive": true
    }
  }
}
```

---

## 🎯 Solution Based on Findings

### If Backend Returns Correct Data BUT Frontend Redirects:

**Issue:** Response structure mismatch

**Fix:**
```typescript
// Frontend expects:
data.user.role === 'ADMIN'

// But backend might be returning:
data.data.user.role === 'ADMIN'
```

**Solution:** Update frontend to match backend structure.

---

### If Auth Token Missing:

**Issue:** Cookie not being set on login

**Fix:** Check login endpoint sets cookie correctly:
```typescript
res.cookie('auth-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

---

### If Backend Times Out:

**Issue:** Railway backend slow or down

**Fix:** 
1. Check Railway logs: `railway logs --service backend`
2. Verify backend is running: `curl https://interchange.kennexai.com/health`
3. Increase frontend timeout

---

## 📋 Action Items

**IMMEDIATE:**
1. ✅ Added comprehensive logging (Commit: af01e23)
2. ⏳ **Check browser console for diagnostic logs**
3. ⏳ **Report findings from console**

**NEXT:**
Based on console findings, will implement specific fix.

---

## 🆘 Emergency Bypass (Temporary)

If you need immediate admin access while we debug:

### Option 1: Use Local Token Bypass
```typescript
// In frontend/src/app/api/auth/profile/route.ts
// Temporarily add at the top of GET function:
if (process.env.NODE_ENV === 'development') {
  return NextResponse.json({
    success: true,
    user: {
      id: 509,
      email: 'ken@simpleemails.co.uk',
      username: 'ken',
      name: 'Kenan',
      role: 'ADMIN',  // ← Force admin role
      isActive: true
    }
  });
}
```

### Option 2: Disable Admin Check Temporarily
```typescript
// In frontend/src/app/admin/page.tsx
// Comment out the authorization check:
useEffect(() => {
  // checkAdminAccess();  // ← Comment out
  setIsAuthorized(true);  // ← Force authorized
}, [router]);
```

**⚠️ WARNING:** These are temporary bypasses only for debugging!

---

## 📊 Monitoring

Once fixed, verify with:

```bash
# Test admin access
curl -c cookies.txt -X POST https://app.kennexai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ken","password":"YOUR_PASSWORD"}'

# Check profile
curl -b cookies.txt https://app.kennexai.com/api/auth/profile

# Should return:
# { "success": true, "user": { "role": "ADMIN", ... } }
```

---

## 🎓 Prevention

After fix, add tests:

```typescript
// Test admin access flow
describe('Admin Page Authorization', () => {
  it('should allow ADMIN role access', async () => {
    const response = await fetch('/admin', {
      headers: { Cookie: 'auth-token=ADMIN_TOKEN' }
    });
    expect(response.status).toBe(200);
  });

  it('should redirect AGENT role', async () => {
    const response = await fetch('/admin', {
      headers: { Cookie: 'auth-token=AGENT_TOKEN' }
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/dashboard');
  });
});
```

---

## ✅ Resolution Checklist

- [ ] Browser console shows detailed logs
- [ ] Auth token exists in cookies
- [ ] Backend returns correct data structure
- [ ] Frontend receives user.role === 'ADMIN'
- [ ] No timeout errors
- [ ] Admin page loads without redirect
- [ ] All admin sections accessible

---

**Status:** AWAITING BROWSER CONSOLE OUTPUT  
**Next:** Once you provide console logs, we can implement specific fix
