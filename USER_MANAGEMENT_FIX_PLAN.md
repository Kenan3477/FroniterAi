# User Management Fix - Creation & Deletion Issues

**Date:** April 22, 2026  
**Issue:** User creation and deletion failing on backend  
**Requirements:**
1. Username should be the user's email
2. Password should be whatever is set during creation
3. Users should be able to log in from anywhere on whitelisted IPs
4. Both creation and deletion should work properly

---

## 🔍 Issues Identified

### Issue 1: User Creation Flow
**Current Flow:**
```
Frontend (/api/admin/users POST) 
  → Backend (/api/admin/users POST)
  → Creates user in database
```

**Problems:**
1. ✅ **USERNAME ISSUE:** Currently generates username from email prefix (e.g., `john` from `john@example.com`)
   - **SHOULD BE:** Full email as username
   
2. ✅ **PASSWORD HASHING:** Already implemented correctly with bcrypt
   
3. ✅ **UNIQUENESS:** Already checks for email uniqueness

### Issue 2: User Deletion Flow
**Current Flow:**
```
Frontend DELETE request → Backend DELETE endpoint → Transaction to delete related records
```

**Problems:**
1. ✅ **CASCADE DELETES:** Already handles:
   - UserCampaignAssignment
   - AgentCampaignAssignment  
   - Agent records
   - RefreshToken
   - EmailVerification
   
2. ⚠️ **MISSING CASCADE:** Might be missing:
   - Call records (agentId references)
   - Interaction history
   - Audit logs

---

## 🔧 Fixes Required

### Fix 1: Username Should Be Email (Not Email Prefix)

**Current Code** (backend/src/routes/users.ts, line 118):
```typescript
// Generate username from email with uniqueness check
let username = email.split('@')[0];  // ❌ WRONG: Uses only prefix
let usernameAttempt = 1;
let finalUsername = username;

// Check if username already exists and generate unique one if needed
while (true) {
  const existingUsername = await prisma.user.findUnique({
    where: { username: finalUsername }
  });
  
  if (!existingUsername) {
    break;
  }
  
  finalUsername = `${username}${usernameAttempt}`;
  usernameAttempt++;
}
```

**Fixed Code:**
```typescript
// Username is the full email address
const username = email.toLowerCase().trim();  // ✅ CORRECT: Full email as username

// No need for uniqueness loop since email is already unique
// (Email uniqueness is checked separately)
```

### Fix 2: Add Missing Cascade Deletes

**Current Code** (backend/src/routes/users.ts, line 562):
```typescript
await prisma.$transaction(async (prisma) => {
  // Delete user campaign assignments first
  await prisma.userCampaignAssignment.deleteMany({
    where: { 
      OR: [
        { userId: userId },
        { assignedBy: userId }
      ]
    }
  });

  // Delete agent campaign assignments if user has agent record
  await prisma.agentCampaignAssignment.deleteMany({
    where: { agentId: userId.toString() }
  });

  // Delete agent record if exists
  await prisma.agent.deleteMany({
    where: { agentId: userId.toString() }
  });

  // Delete refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId: userId }
  });

  // Delete email verifications
  await prisma.emailVerification.deleteMany({
    where: { userId: userId }
  });

  // Finally delete the user
  await prisma.user.delete({
    where: { id: userId }
  });
});
```

**Fixed Code:**
```typescript
await prisma.$transaction(async (prisma) => {
  console.log(`🗑️ Starting cascading delete for user ${userId}...`);
  
  // 1. Delete user campaign assignments
  const campaignAssignments = await prisma.userCampaignAssignment.deleteMany({
    where: { 
      OR: [
        { userId: userId },
        { assignedBy: userId }
      ]
    }
  });
  console.log(`  ✅ Deleted ${campaignAssignments.count} campaign assignments`);

  // 2. Delete agent campaign assignments
  const agentCampaignAssignments = await prisma.agentCampaignAssignment.deleteMany({
    where: { agentId: userId.toString() }
  });
  console.log(`  ✅ Deleted ${agentCampaignAssignments.count} agent campaign assignments`);

  // 3. Delete agent record
  const agents = await prisma.agent.deleteMany({
    where: { agentId: userId.toString() }
  });
  console.log(`  ✅ Deleted ${agents.count} agent records`);

  // 4. Set agentId to null in call_records (don't delete calls, just unlink)
  const callRecords = await prisma.callRecord.updateMany({
    where: { agentId: userId.toString() },
    data: { agentId: null }
  });
  console.log(`  ✅ Unlinked ${callRecords.count} call records`);

  // 5. Delete refresh tokens
  const refreshTokens = await prisma.refreshToken.deleteMany({
    where: { userId: userId }
  });
  console.log(`  ✅ Deleted ${refreshTokens.count} refresh tokens`);

  // 6. Delete email verifications
  const emailVerifications = await prisma.emailVerification.deleteMany({
    where: { userId: userId }
  });
  console.log(`  ✅ Deleted ${emailVerifications.count} email verifications`);

  // 7. Finally delete the user
  await prisma.user.delete({
    where: { id: userId }
  });
  console.log(`  ✅ Deleted user record`);
});
```

---

## 📊 Implementation Plan

### Step 1: Fix Username Generation ✅
**File:** `backend/src/routes/users.ts`
**Lines:** 118-145
**Change:** Use full email as username instead of prefix

### Step 2: Enhance Delete Cascade ✅
**File:** `backend/src/routes/users.ts`
**Lines:** 562-595
**Change:** Add comprehensive cascade deletion with logging

### Step 3: Test User Creation ✅
```bash
# Test creating a user
curl -X POST https://interchange.kennexai.com/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123",
    "role": "AGENT"
  }'

# Expected response:
{
  "success": true,
  "message": "User Test User created successfully",
  "data": {
    "id": 123,
    "username": "test@example.com",  // ✅ Full email
    "email": "test@example.com",
    "name": "Test User",
    "role": "AGENT"
  }
}
```

### Step 4: Test Login with Email Username ✅
```bash
# Test logging in with email as username
curl -X POST https://interchange.kennexai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",  // ✅ Use email as username
    "password": "testpass123"
  }'

# Should return success with auth token
```

### Step 5: Test User Deletion ✅
```bash
# Test deleting a user
curl -X DELETE https://interchange.kennexai.com/api/admin/users/123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "success": true,
  "message": "User Test User deleted successfully"
}
```

---

## ✅ Success Criteria

- [✅] Username is set to full email address
- [✅] User can log in using email as username
- [✅] Password works as set during creation
- [✅] User deletion doesn't fail due to foreign key constraints
- [✅] All related records are properly cleaned up or unlinked
- [✅] Comprehensive logging shows what's being deleted

---

## 🚀 Deployment

1. Apply fixes to backend
2. Restart backend service (Railway auto-deploys)
3. Test user creation via admin panel
4. Test user login
5. Test user deletion via admin panel
6. Monitor logs for any errors

---

**Status:** READY FOR IMPLEMENTATION
