/**
 * Simplified Railway Production Database Migration - User Organization Fix
 * This script will run on Railway deployment to fix user organization assignments
 */
const { PrismaClient } = require('@prisma/client');

async function migrateProductionDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀🚀🚀 STARTING SIMPLIFIED RAILWAY MIGRATION - USER ORGANIZATION FIX 🚀🚀🚀');
    console.log('🔗 Database URL exists:', !!process.env.DATABASE_URL);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🚂 Railway Environment:', process.env.RAILWAY_ENVIRONMENT);
    console.log('📅 Migration timestamp:', new Date().toISOString());
    
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    // 1. Create/ensure Omnivox organization exists
    console.log('1. Creating/updating Omnivox organization...');
    const org = await prisma.organization.upsert({
      where: { id: userOrgId },
      create: {
        id: userOrgId,
        name: 'Omnivox Organization',
        displayName: 'Omnivox AI Dialer',
        description: 'Primary organization for Omnivox AI dialer system',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        name: 'Omnivox Organization',
        displayName: 'Omnivox AI Dialer',
        updatedAt: new Date()
      }
    });
    console.log('✅ Organization:', org.name);
    
    // 2. Count users before migration
    const usersBefore = await prisma.user.count();
    const usersInOmnivoxBefore = await prisma.user.count({
      where: { organizationId: userOrgId }
    });
    console.log(`📊 Users before migration: ${usersBefore} total, ${usersInOmnivoxBefore} in Omnivox`);
    
    // 3. Move ALL users to Omnivox organization
    console.log('3. Moving all users to Omnivox organization...');
    const allUsersUpdate = await prisma.user.updateMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: { not: userOrgId } }
        ]
      },
      data: {
        organizationId: userOrgId
      }
    });
    console.log(`✅ Moved ${allUsersUpdate.count} users to Omnivox organization`);
    
    // 4. Verify user migration
    const usersAfter = await prisma.user.count();
    const usersInOmnivoxAfter = await prisma.user.count({
      where: { organizationId: userOrgId }
    });
    console.log(`📊 Users after migration: ${usersAfter} total, ${usersInOmnivoxAfter} in Omnivox`);
    
    // 5. List all users for verification
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true
      }
    });
    
    console.log('👥 All users in system:');
    allUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}, OrgID: ${user.organizationId}, Active: ${user.isActive}`);
    });
    
    // 6. Ensure DAC campaign exists
    console.log('6. Creating/updating DAC campaign...');
    const dacCampaign = await prisma.campaign.upsert({
      where: { id: '550e8400-e29b-41d4-a716-446655440004' },
      create: {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'DAC',
        description: 'Database Access Campaign for testing and demonstrations',
        organizationId: userOrgId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        name: 'DAC',
        description: 'Database Access Campaign for testing and demonstrations',
        organizationId: userOrgId,
        isActive: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ DAC campaign created/updated:', dacCampaign.name);
    
    // 7. List all campaigns in Omnivox organization
    const omnivoxCampaigns = await prisma.campaign.findMany({
      where: { organizationId: userOrgId },
      select: { id: true, name: true, isActive: true }
    });
    console.log(`📋 Campaigns in Omnivox organization: ${omnivoxCampaigns.length}`);
    omnivoxCampaigns.forEach(campaign => {
      console.log(`  - ${campaign.name} (Active: ${campaign.isActive})`);
    });
    
    // 8. Summary
    console.log('\n🎉🎉🎉 RAILWAY USER MIGRATION COMPLETED SUCCESSFULLY! 🎉🎉🎉');
    console.log(`✅ Organization: ${org.name} (${org.id})`);
    console.log(`✅ Users moved: ${allUsersUpdate.count}`);
    console.log(`✅ Total users in Omnivox: ${usersInOmnivoxAfter}`);
    console.log(`✅ Total campaigns: ${omnivoxCampaigns.length}`);
    console.log('🔍 DAC campaign should now be visible in admin interface');
    console.log('👥 ALL USERS should now be visible in User Management');
    console.log('📞 Users can now access campaigns in their organization');
    console.log('🚀🚀🚀 MIGRATION COMPLETE - REFRESH FRONTEND TO SEE ALL USERS 🚀🚀🚀');
    
    return {
      success: true,
      organization: org,
      usersMoved: allUsersUpdate.count,
      totalUsersInOmnivox: usersInOmnivoxAfter,
      totalUsers: usersAfter,
      campaigns: omnivoxCampaigns.length,
      userList: allUsers
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateProductionDatabase()
    .then(result => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateProductionDatabase };