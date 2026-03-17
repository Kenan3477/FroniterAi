const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
});

/**
 * Normalize phone number to a standard format for comparison
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle UK numbers - remove leading 44 if present and add it back
  if (digitsOnly.startsWith('44') && digitsOnly.length > 10) {
    return '44' + digitsOnly.substring(2);
  }
  
  // If starts with 0, convert to UK format
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return '44' + digitsOnly.substring(1);
  }
  
  // If 10 digits starting with 7, assume UK mobile
  if (digitsOnly.length === 10 && digitsOnly.startsWith('7')) {
    return '44' + digitsOnly;
  }
  
  return digitsOnly;
}

/**
 * Choose the best contact from a group of duplicates
 */
function chooseBestContact(contacts) {
  // Priority order:
  // 1. Contacts with real names (not "Unknown" or "Inbound")
  // 2. Contacts with more complete information
  // 3. Newest contact
  
  const scored = contacts.map(contact => {
    let score = 0;
    
    // Prefer real names
    const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    if (fullName && 
        !fullName.includes('Unknown') && 
        !fullName.includes('Inbound') &&
        fullName !== 'Contact' &&
        fullName.length > 1) {
      score += 100;
    }
    
    // Prefer contacts with full names
    if (contact.fullName && !contact.fullName.includes('Unknown')) {
      score += 50;
    }
    
    // Prefer contacts with more information
    if (contact.email) score += 10;
    if (contact.company) score += 10;
    if (contact.address) score += 5;
    if (contact.firstName && contact.lastName) score += 15;
    
    // SMALL bonus for newer contacts (only as tie-breaker)
    score += Math.floor(new Date(contact.createdAt).getTime() / 10000000); // Much smaller weight
    
    return { ...contact, score };
  });
  
  // Sort by score and return the best
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

async function deduplicateContacts() {
  try {
    console.log('🔍 Starting contact deduplication process...');
    
    // Get all contacts with phone numbers
    const allContacts = await prisma.contact.findMany({
      where: {
        phone: {
          not: ''
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Found ${allContacts.length} contacts with phone numbers`);
    
    // Group contacts by normalized phone number
    const phoneGroups = {};
    let normalizedCount = 0;
    
    for (const contact of allContacts) {
      const normalizedPhone = normalizePhoneNumber(contact.phone);
      
      if (normalizedPhone) {
        if (!phoneGroups[normalizedPhone]) {
          phoneGroups[normalizedPhone] = [];
        }
        phoneGroups[normalizedPhone].push(contact);
        normalizedCount++;
      }
    }
    
    console.log(`📱 Normalized ${normalizedCount} phone numbers`);
    
    // Find duplicates
    const duplicateGroups = Object.entries(phoneGroups).filter(([phone, contacts]) => contacts.length > 1);
    
    console.log(`🔍 Found ${duplicateGroups.length} groups with duplicate phone numbers:`);
    
    let totalMerged = 0;
    let totalDeleted = 0;
    
    for (const [normalizedPhone, contacts] of duplicateGroups) {
      console.log(`\n📞 Phone ${normalizedPhone} has ${contacts.length} contacts:`);
      
      contacts.forEach((contact, index) => {
        const name = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'No name';
        console.log(`  ${index + 1}. ${contact.contactId} - ${name} (${contact.phone}) - Created: ${contact.createdAt.toISOString().split('T')[0]}`);
      });
      
      // Choose the best contact to keep
      const bestContact = chooseBestContact(contacts);
      const contactsToDelete = contacts.filter(c => c.id !== bestContact.id);
      
      console.log(`✅ Keeping: ${bestContact.contactId} - ${bestContact.fullName || bestContact.firstName + ' ' + bestContact.lastName}`);
      console.log(`❌ Will delete: ${contactsToDelete.length} duplicates`);
      
      // Update CallRecords to point to the best contact
      for (const contactToDelete of contactsToDelete) {
        const callRecordsUpdated = await prisma.callRecord.updateMany({
          where: {
            contactId: contactToDelete.contactId
          },
          data: {
            contactId: bestContact.contactId
          }
        });
        
        if (callRecordsUpdated.count > 0) {
          console.log(`  📞 Updated ${callRecordsUpdated.count} call records from ${contactToDelete.contactId} to ${bestContact.contactId}`);
        }
        
        totalMerged += callRecordsUpdated.count;
      }
      
      // Delete the duplicate contacts
      for (const contactToDelete of contactsToDelete) {
        await prisma.contact.delete({
          where: {
            id: contactToDelete.id
          }
        });
        totalDeleted++;
      }
    }
    
    console.log(`\n📊 Deduplication Summary:`);
    console.log(`- Processed ${duplicateGroups.length} groups of duplicates`);
    console.log(`- Updated ${totalMerged} call records`);
    console.log(`- Deleted ${totalDeleted} duplicate contacts`);
    console.log(`✅ Deduplication complete!`);
    
  } catch (error) {
    console.error('❌ Error during deduplication:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add dry-run option
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('🧪 DRY RUN MODE - No changes will be made');
  // TODO: Implement dry-run logic that shows what would be done
} else {
  deduplicateContacts();
}