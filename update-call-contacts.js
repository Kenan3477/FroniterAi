const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
});

/**
 * Normalize phone number for comparison
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.startsWith('44') && digitsOnly.length > 10) {
    return '44' + digitsOnly.substring(2);
  }
  
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return '44' + digitsOnly.substring(1);
  }
  
  if (digitsOnly.length === 10 && digitsOnly.startsWith('7')) {
    return '44' + digitsOnly;
  }
  
  return digitsOnly;
}

async function updateCallRecordsToCorrectContacts() {
  try {
    console.log('🔍 Starting call record contact linking update...');
    
    // Get all call records with their current contacts
    const callRecords = await prisma.callRecord.findMany({
      include: {
        contact: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📞 Found ${callRecords.length} call records to check`);
    
    let updatedCount = 0;
    let checkedCount = 0;
    
    for (const callRecord of callRecords) {
      checkedCount++;
      
      if (!callRecord.contact || !callRecord.contact.phone) {
        continue;
      }
      
      const currentContact = callRecord.contact;
      const currentPhone = normalizePhoneNumber(currentContact.phone);
      
      // Skip if current contact has a proper name (not generic)
      const currentName = `${currentContact.firstName || ''} ${currentContact.lastName || ''}`.trim();
      const hasProperName = currentName && 
                           !currentName.includes('Unknown') && 
                           !currentName.includes('Inbound') &&
                           currentName !== 'Contact' &&
                           currentName.length > 2;
      
      if (hasProperName && currentContact.fullName && !currentContact.fullName.includes('Unknown')) {
        continue; // Already has a good contact
      }
      
      // Look for better contacts with the same phone number
      const betterContacts = await prisma.contact.findMany({
        where: {
          phone: {
            not: currentContact.phone // Different phone format but same number
          },
          OR: [
            {
              firstName: {
                not: null,
                notIn: ['Unknown', 'Inbound']
              }
            },
            {
              fullName: {
                not: null,
                not: {
                  contains: 'Unknown'
                }
              }
            }
          ]
        }
      });
      
      // Filter for contacts with matching normalized phone numbers
      const matchingContacts = betterContacts.filter(contact => 
        normalizePhoneNumber(contact.phone) === currentPhone
      );
      
      if (matchingContacts.length > 0) {
        // Choose the best matching contact
        const bestContact = matchingContacts.reduce((best, current) => {
          let bestScore = 0;
          let currentScore = 0;
          
          // Score based on name quality
          const bestName = `${best.firstName || ''} ${best.lastName || ''}`.trim();
          const currentName = `${current.firstName || ''} ${current.lastName || ''}`.trim();
          
          if (best.fullName && !best.fullName.includes('Unknown')) bestScore += 50;
          if (current.fullName && !current.fullName.includes('Unknown')) currentScore += 50;
          
          if (bestName.length > 2 && !bestName.includes('Unknown')) bestScore += 30;
          if (currentName.length > 2 && !currentName.includes('Unknown')) currentScore += 30;
          
          if (best.email) bestScore += 10;
          if (current.email) currentScore += 10;
          
          if (best.address) bestScore += 10;
          if (current.address) currentScore += 10;
          
          return currentScore > bestScore ? current : best;
        });
        
        // Update the call record to use the better contact
        console.log(`📞 Call ${callRecord.id}:`);
        console.log(`  FROM: ${currentContact.contactId} - ${currentContact.fullName || currentName} (${currentContact.phone})`);
        console.log(`  TO: ${bestContact.contactId} - ${bestContact.fullName || bestContact.firstName + ' ' + bestContact.lastName} (${bestContact.phone})`);
        
        await prisma.callRecord.update({
          where: { id: callRecord.id },
          data: { contactId: bestContact.contactId }
        });
        
        updatedCount++;
      }
      
      if (checkedCount % 100 === 0) {
        console.log(`⏳ Checked ${checkedCount}/${callRecords.length} call records...`);
      }
    }
    
    console.log(`\n📊 Update Summary:`);
    console.log(`- Checked ${checkedCount} call records`);
    console.log(`- Updated ${updatedCount} call records to better contacts`);
    console.log(`✅ Contact linking update complete!`);
    
  } catch (error) {
    console.error('❌ Error updating call record contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function updateSpecificKenanCalls() {
  try {
    console.log('🎯 Specifically fixing Kenan Davies call records...');
    
    // Find the "Kenan Davies" contact
    const kenanContact = await prisma.contact.findFirst({
      where: {
        OR: [
          {
            AND: [
              { firstName: 'Kenan' },
              { lastName: 'Davies' }
            ]
          },
          {
            fullName: 'Kenan Davies'
          }
        ]
      }
    });
    
    if (!kenanContact) {
      console.log('❌ Could not find Kenan Davies contact');
      return;
    }
    
    console.log(`✅ Found Kenan Davies contact: ${kenanContact.contactId} (Phone: ${kenanContact.phone})`);
    
    // Find call records with phone numbers that match Kenan's (different formats)
    const kenanPhone = normalizePhoneNumber(kenanContact.phone);
    
    const allContacts = await prisma.contact.findMany();
    const matchingContactIds = allContacts
      .filter(contact => normalizePhoneNumber(contact.phone) === kenanPhone)
      .map(contact => contact.contactId);
    
    console.log(`📱 Found ${matchingContactIds.length} contacts with matching phone numbers:`, matchingContactIds);
    
    // Update all call records with matching contacts to use the Kenan Davies contact
    const updateResult = await prisma.callRecord.updateMany({
      where: {
        contactId: {
          in: matchingContactIds.filter(id => id !== kenanContact.contactId)
        }
      },
      data: {
        contactId: kenanContact.contactId
      }
    });
    
    console.log(`📞 Updated ${updateResult.count} call records to use Kenan Davies contact`);
    
    // Clean up duplicate contacts if desired (optional)
    console.log('🧹 Note: Run deduplicate-contacts.js to remove duplicate contacts');
    
  } catch (error) {
    console.error('❌ Error updating Kenan calls:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--kenan-only')) {
    await updateSpecificKenanCalls();
  } else {
    await updateCallRecordsToCorrectContacts();
  }
}

main();