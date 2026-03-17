# Dial Queue Testing Guide

Your complete Kennex call center dial queue system is now ready for testing! 🎉

## 🗄️ Database Setup Complete

✅ **SQLite Database**: `dev.db` with complete schema  
✅ **Minimal Test Data**: 1 campaign, 1 data list, 10 fresh contacts, 1 agent  
✅ **Campaign Assignment**: Pre-configured with 100% blend weight  

## 🔍 Visual Database Browser

**Prisma Studio** is running at: http://localhost:5556

Browse your minimal test data:
- **Campaigns**: 1 test campaign (TEST_001)
- **Data Lists**: 1 test list (LIST_001) 
- **Contacts**: 10 fresh contacts ready to dial
- **Agents**: 1 test agent
- **Dial Queue**: Real-time queue entries

## 🧪 Testing Scenarios

### 1. Admin Interface Testing
```bash
# The Next.js application should be running
# Open: http://localhost:3002/admin
```

**Test the campaign list:**
- View the single test campaign "Test Campaign" 
- Click the action menu (⋮) next to the campaign
- **Click "Outbound Queue"** to see the dial queue

### 2. Outbound Queue Testing

**Campaign Details:**
- **Campaign ID**: TEST_001  
- **Name**: Test Campaign
- **Status**: Active
- **Data List**: LIST_001 (100% blend weight)
- **Contacts**: 10 fresh contacts ready to dial

**Test Steps:**
1. **Access Queue**: Click "Outbound Queue" in campaign actions
2. **View Queue Tab**: See contacts queued for dialing
3. **View Contacts Tab**: See all 10 contacts in the campaign
4. **Test Dialing**: Click "Dial" button next to a contact
5. **Watch Updates**: Queue updates in real-time as contacts are dialed

### 3. API Testing

#### Generate Dial Queue
```bash
# Generate queue for test campaign
curl -X POST http://localhost:3002/api/dial-queue/generate \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "TEST_001",
    "maxRecords": 10
  }'
```

#### Get Queue Entries
```bash
# View current queue
curl "http://localhost:3002/api/dial-queue?campaignId=TEST_001"
```

#### Get Next Contact
```bash
# Agent gets next contact to dial
curl -X POST http://localhost:3002/api/dial-queue/next \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "TEST_001",
    "agentId": "AGENT_001"
  }'
```

#### View Campaign Contacts
```bash
# See all contacts in campaign
curl "http://localhost:3002/api/contacts?campaignId=TEST_001"
```

## 🎯 Key Testing Features

### Minimal Clean System
✅ **1 Campaign**: Clean test environment  
✅ **1 Data List**: Simple list assignment  
✅ **10 Fresh Contacts**: All ready to dial  
✅ **No Call History**: Fresh system like Kennex  

### Weighted Blending (Even with 1 List)
✅ **100% Weight**: All contacts from single list  
✅ **Priority Assignment**: Queue sorted by priority  
✅ **Real-time Updates**: Queue refreshes after each dial  

### Contact Management
✅ **Status Tracking**: NotAttempted → Dialing → Completed  
✅ **Contact Locking**: Prevents duplicate assignments  
✅ **Attempt Counting**: Tracks dial attempts  

## 📊 Database Verification

### Check Current Data
```sql
-- View the test campaign
SELECT * FROM campaigns WHERE campaignId = 'TEST_001';

-- View the assigned data list
SELECT * FROM data_lists WHERE campaignId = 'TEST_001';

-- View fresh contacts
SELECT contactId, firstName, lastName, phone, status, attemptCount 
FROM contacts WHERE listId = 'LIST_001';

-- Check dial queue
SELECT * FROM dial_queue WHERE campaignId = 'TEST_001';
```

### Monitor Queue Activity
```sql
-- Watch queue changes in real-time
SELECT 
  dq.campaignId,
  dq.status,
  dq.priority,
  c.firstName,
  c.lastName,
  c.phone,
  dq.queuedAt
FROM dial_queue dq
JOIN contacts c ON dq.contactId = c.contactId
WHERE dq.campaignId = 'TEST_001'
ORDER BY dq.priority DESC;
```

## 🚀 Step-by-Step Test Walkthrough

### Step 1: Verify Clean System
1. Open http://localhost:3002/admin
2. See **1 campaign** in the list
3. Confirm campaign shows "Test Campaign" 

### Step 2: Access Outbound Queue  
1. Click the **⋮** menu next to "Test Campaign"
2. Click **"Outbound Queue"**
3. See the queue interface load

### Step 3: Check Queue Generation
1. **Active Queue Tab**: Should show queue entries
2. **All Contacts Tab**: Should show 10 fresh contacts
3. If queue is empty, click **"Refresh Queue"**

### Step 4: Test Dialing
1. In **Active Queue** tab, click **"Dial"** next to a contact
2. Watch contact status change from "queued" to "dialing"
3. Check **All Contacts** tab to see contact status update
4. Refresh queue to see new contacts appear

### Step 5: Monitor Real-time Updates
1. Open Prisma Studio at http://localhost:5556
2. Watch the `dial_queue` table update in real-time
3. Check `contacts` table for status changes
4. Verify locking mechanism works

## 🔧 Reset System for Fresh Testing

If you want to reset to a completely fresh system:

```bash
# Reset with minimal data
npx tsx prisma/seed-minimal.ts
```

This will give you:
- 1 fresh campaign
- 1 data list  
- 10 new contacts (all NotAttempted status)
- 1 test agent
- 0 call records

## 📈 Success Criteria

Your system is working correctly when:

1. ✅ **Clean Interface**: Shows 1 campaign, not 5
2. ✅ **Outbound Queue Loads**: Clicking menu opens queue view
3. ✅ **Queue Generation**: Fresh contacts appear in queue
4. ✅ **Dialing Works**: Contacts can be "dialed" and status updates
5. ✅ **Real-time Updates**: UI refreshes to show changes
6. ✅ **Database Persistence**: Changes saved to SQLite database

## 🎉 What You Now Have

**Complete Kennex Replication:**
- ✅ Clean, minimal test environment 
- ✅ Weighted dial queue system
- ✅ Contact locking and status management
- ✅ Real-time queue population
- ✅ Database persistence with SQLite
- ✅ Visual queue management interface
- ✅ REST API for all operations

**Test the outbound queue at**: http://localhost:3002/admin → Test Campaign → ⋮ → Outbound Queue

The system now looks and behaves like a fresh Kennex installation! 🚀