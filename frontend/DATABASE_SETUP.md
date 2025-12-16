# Development Database Setup for KENNEX Dial Queue

## Quick Start

```bash
# 1. Install dependencies
npm install prisma @prisma/client sqlite3

# 2. Generate Prisma client
npx prisma generate

# 3. Create and migrate database
npx prisma db push

# 4. Seed with test data
npm run db:seed

# 5. View database in browser
npx prisma studio
```

## Database Choice: SQLite + Prisma

**Why SQLite for development?**
- ✅ **Zero setup** - No server installation needed
- ✅ **File-based** - Portable database stored as `./prisma/dev.db`
- ✅ **Real SQL** - Full database functionality
- ✅ **Easy migration** - Can switch to PostgreSQL/MySQL later
- ✅ **Prisma integration** - Type-safe ORM with auto-completion

## Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma db push --force-reset && npm run db:seed",
    "db:migrate": "prisma migrate dev"
  }
}
```

## Required Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0"
  },
  "devDependencies": {
    "tsx": "^4.6.0"
  }
}
```

## File Structure

```
kennex/frontend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts           # Test data seeding
│   └── dev.db            # SQLite database file (auto-generated)
├── src/
│   ├── lib/
│   │   └── db.ts         # Prisma client singleton
│   ├── services/
│   │   ├── listCampaignService.db.ts  # Database-backed services
│   │   └── dialQueueEngine.db.ts      # Database-backed engine
│   └── types/
│       └── dialQueue.ts   # TypeScript interfaces
└── package.json
```

## Development Workflow

### 1. Initial Setup
```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# Populate with test data
npm run db:seed
```

### 2. Daily Development
```bash
# View/edit data in browser
npx prisma studio

# Reset database with fresh test data
npm run db:reset

# Generate client after schema changes
npm run db:generate
```

### 3. Schema Changes
```bash
# After modifying prisma/schema.prisma
npx prisma db push
npx prisma generate
npm run db:seed
```

## Test Data Overview

The seed script creates:
- **5 Campaigns** - Matching your existing campaign structure
- **6 Data Lists** - Various types (cold, warm, VIP, etc.)
- **~300 Contacts** - Spread across lists with realistic data
- **5 Agents** - Different statuses (available, on call, break)
- **25 Call Records** - Historical call data

### Pre-configured Test Scenarios:
- Campaign 1125: 2 active lists with 60/40 blend weight
- Campaign 6002: 2 active lists with 70/30 blend weight  
- Campaign 6666: 1 inactive list ready for activation

## Database Browser

Access Prisma Studio at http://localhost:5555:
```bash
npx prisma studio
```

Features:
- ✅ Visual data browser
- ✅ Edit records directly
- ✅ Run queries
- ✅ View relationships
- ✅ Export data

## Production Migration Path

When ready for production:

1. **PostgreSQL/MySQL Setup**:
```prisma
datasource db {
  provider = "postgresql"  // or "mysql"
  url      = env("DATABASE_URL")
}
```

2. **Environment Variables**:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/kennex"
```

3. **Migration**:
```bash
npx prisma migrate deploy
```

## Advantages Over Mock Data

| Feature | Mock Data | SQLite + Prisma |
|---------|-----------|-----------------|
| **Persistence** | ❌ Lost on restart | ✅ Persistent storage |
| **Relationships** | ❌ Manual joins | ✅ Auto-resolved relations |
| **Queries** | ❌ Array filtering | ✅ SQL queries |
| **Transactions** | ❌ Race conditions | ✅ ACID compliance |
| **Type Safety** | ⚠️ Manual types | ✅ Auto-generated types |
| **Performance** | ⚠️ Memory limited | ✅ Indexed queries |
| **Testing** | ❌ Hard to reset | ✅ Easy reset/seed |
| **Production Ready** | ❌ Development only | ✅ Production path |

## Example Usage

```typescript
import db from '../lib/db';

// Get active lists for campaign
const activeLists = await db.dataList.findMany({
  where: { 
    campaignId: '1125',
    active: true 
  },
  include: {
    contacts: {
      where: {
        status: 'NotAttempted',
        locked: false
      }
    }
  }
});

// Create dial queue entry
const queueEntry = await db.dialQueueEntry.create({
  data: {
    queueId: 'queue_123',
    campaignId: '1125',
    listId: 'list_001',
    contactId: 'contact_001',
    status: 'queued',
    priority: 100
  }
});
```

This gives you a production-ready database setup that's perfect for development and testing! 🚀