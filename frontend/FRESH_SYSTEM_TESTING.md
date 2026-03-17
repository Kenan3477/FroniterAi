# Dial Queue Testing Guide - Fresh Empty System

Your complete Kennex call center dial queue system is now ready for testing! 🎉

## 🗄️ Database Setup Complete

✅ **SQLite Database**: `dev.db` with complete schema  
✅ **Empty System**: 1 campaign, 1 empty data list, 0 contacts, 1 agent  
✅ **Campaign Assignment**: Pre-configured structure ready for data upload  

## 🔍 Visual Database Browser

**Prisma Studio** is running at: http://localhost:5556

Browse your empty system:
- **Campaigns**: 1 test campaign (TEST_001)
- **Data Lists**: 1 empty list (LIST_001) ready for file upload
- **Contacts**: 0 contacts (upload CSV/Excel files to add)
- **Agents**: 1 test agent
- **Dial Queue**: Empty until contacts are uploaded

## 🧪 Testing Scenarios

### 1. Admin Interface Testing
```bash
# The Next.js application should be running
# Open: http://localhost:3002/admin
```

**Test the empty system:**
- View the single test campaign "Test Campaign" 
- Click the action menu (⋮) next to the campaign
- **Click "Outbound Queue"** to see empty state
- **Navigate to Data Management** to upload contact files

### 2. Empty System Verification

**Campaign Details:**
- **Campaign ID**: TEST_001  
- **Name**: Test Campaign
- **Status**: Active
- **Data List**: LIST_001 (100% blend weight, 0 contacts)
- **Contacts**: None (awaiting file upload)

**Test Steps:**
1. **Access Queue**: Click "Outbound Queue" in campaign actions
2. **Verify Empty State**: Should show "No contacts uploaded" message
3. **Check All Contacts Tab**: Should show empty state with upload message
4. **Upload Data**: Use Data Management to upload CSV/Excel files
5. **Return to Queue**: See contacts appear after upload

### 3. Data Upload Testing

#### Upload Contact Files
1. **Go to Data Management** tab in admin interface
2. **Create or select data list** "Test Data List"
3. **Upload CSV/Excel file** with contact data
4. **Map columns** (First Name, Last Name, Phone, Email)
5. **Complete upload process**
6. **Return to Campaign Queue** to see contacts

#### Sample CSV Format
```csv
FirstName,LastName,Phone,Email
John,Smith,555-123-4567,john.smith@example.com
Jane,Doe,555-234-5678,jane.doe@example.com
Mike,Johnson,555-345-6789,mike.johnson@example.com
```

### 4. API Testing (Before and After Upload)

#### Check Empty Queue (Before Upload)
```bash
# View empty queue
curl "http://localhost:3002/api/dial-queue?campaignId=TEST_001"
```

#### View Empty Contacts (Before Upload)
```bash
# See empty contact list
curl "http://localhost:3002/api/contacts?campaignId=TEST_001"
```

#### Generate Dial Queue (After Upload)
```bash
# Generate queue for test campaign
curl -X POST http://localhost:3002/api/dial-queue/generate \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "TEST_001",
    "maxRecords": 10
  }'
```

## 🎯 Key Testing Features

### Truly Empty System
✅ **1 Campaign**: Clean test environment  
✅ **1 Empty Data List**: Ready for file upload  
✅ **0 Contacts**: Realistic fresh system state  
✅ **No Call History**: Completely fresh like new Kennex installation  

### File Upload Integration
✅ **CSV Support**: Upload comma-separated contact files  
✅ **Excel Support**: Upload .xlsx contact files  
✅ **Column Mapping**: Map file columns to contact fields  
✅ **Data Validation**: Verify uploaded contact data  

### Queue Behavior
✅ **Empty State Handling**: Proper messages when no contacts  
✅ **Post-Upload Population**: Queue appears after data upload  
✅ **Real-time Updates**: System updates after file processing  

## 📊 Database Verification

### Check Empty System
```sql
-- View the test campaign
SELECT * FROM campaigns WHERE campaignId = 'TEST_001';

-- View the empty data list
SELECT * FROM data_lists WHERE campaignId = 'TEST_001';

-- Confirm no contacts exist
SELECT COUNT(*) as contact_count FROM contacts WHERE listId = 'LIST_001';

-- Confirm empty dial queue
SELECT COUNT(*) as queue_count FROM dial_queue WHERE campaignId = 'TEST_001';
```

### After Upload Verification
```sql
-- Check uploaded contacts
SELECT contactId, firstName, lastName, phone, status, listId 
FROM contacts WHERE listId = 'LIST_001';

-- View queue after generation
SELECT * FROM dial_queue WHERE campaignId = 'TEST_001';
```

## 🚀 Step-by-Step Test Walkthrough

### Step 1: Verify Empty System
1. Open http://localhost:3002/admin
2. See **1 campaign** in the list
3. Confirm campaign shows "Test Campaign" 

### Step 2: Check Empty Queue  
1. Click the **⋮** menu next to "Test Campaign"
2. Click **"Outbound Queue"**
3. See **"No contacts uploaded"** message in both tabs

### Step 3: Upload Contact Data
1. Navigate to **Data Management** tab
2. Find "Test Data List" or create new list
3. **Upload CSV/Excel** file with contacts
4. **Map columns** correctly during upload wizard
5. **Complete upload** process

### Step 4: Verify Population
1. Return to **Campaigns** tab
2. Open **"Outbound Queue"** again
3. See contacts now appear in **All Contacts** tab
4. Click **"Refresh Queue"** to generate dial queue
5. Watch **Active Queue** tab populate with prioritized contacts

### Step 5: Test Dialing
1. In **Active Queue** tab, click **"Dial"** next to a contact
2. Watch contact status change from "queued" to "dialing"
3. Verify real-time updates work correctly

## 🔧 Reset System for Fresh Testing

To get back to the completely empty system:

```bash
# Reset to empty system
npx tsx prisma/seed-minimal.ts
```

This gives you:
- 1 campaign (TEST_001)
- 1 empty data list  
- 0 contacts (upload files to add)
- 1 test agent
- 0 call records

## 📈 Success Criteria

Your empty system is working correctly when:

1. ✅ **Shows 1 Campaign**: Clean interface with single test campaign
2. ✅ **Empty Queue States**: Proper "no contacts" messages  
3. ✅ **File Upload Ready**: Data Management can accept CSV/Excel files
4. ✅ **Post-Upload Population**: Queue generates after successful upload
5. ✅ **Real-time Updates**: UI updates after data operations
6. ✅ **Database Persistence**: Changes saved correctly

## 🎉 What You Now Have

**Complete Fresh Kennex System:**
- ✅ Completely empty starting state 
- ✅ Realistic new installation experience
- ✅ File upload integration ready
- ✅ Queue system ready to activate after upload
- ✅ Database persistence with SQLite
- ✅ Professional empty state messaging
- ✅ Complete dial queue workflow ready

**Test the empty system at**: http://localhost:3002/admin → Test Campaign → ⋮ → Outbound Queue

The system now behaves exactly like a fresh Kennex installation with no data uploaded yet! 🚀

**Next Step**: Upload contact data via Data Management to see the dial queue system come alive!