/**
 * Script to update the existing "Organization Administrator" user to use business name
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateExistingOrgAdmin() {
  try {
    console.log('🔧 Looking for Organization Administrator user to update...');
    
    // Find the existing Organization Administrator user
    const orgAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { name: 'Organization Administrator' },
          { firstName: 'Organization' },
          { email: 'hello@theflashteam.co.uk' }
        ]
      },
      include: {
        organization: true
      }
    });
    
    if (orgAdmin) {
      console.log('📋 Found user to update:', {
        id: orgAdmin.id,
        name: orgAdmin.name,
        email: orgAdmin.email,
        organizationName: orgAdmin.organization?.displayName || orgAdmin.organization?.name
      });
      
      if (orgAdmin.organization) {
        const businessName = orgAdmin.organization.displayName || orgAdmin.organization.name;
        const updatedUser = await prisma.user.update({
          where: { id: orgAdmin.id },
          data: {
            firstName: businessName,
            lastName: 'Administrator',
            name: `${businessName} Administrator`
          }
        });
        
        console.log('✅ Updated user successfully:', {
          newName: updatedUser.name,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        });
      } else {
        console.log('⚠️ User has no associated organization, using default business name');
        
        const updatedUser = await prisma.user.update({
          where: { id: orgAdmin.id },
          data: {
            firstName: 'HeatBase Solutions',
            lastName: 'Administrator',
            name: 'HeatBase Solutions Administrator'
          }
        });
        
        console.log('✅ Updated user with default business name:', {
          newName: updatedUser.name,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        });
      }
    } else {
      console.log('❌ No Organization Administrator user found to update');
    }
    
    // Show all users for verification
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
            displayName: true
          }
        }
      }
    });
    
    console.log('📋 All users after update:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role} - Org: ${user.organization?.displayName || 'None'}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingOrgAdmin();