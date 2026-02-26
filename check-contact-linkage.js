const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
});

async function checkContactLinkage() {
    try {
        console.log('🔍 Checking contact linkage for recent calls...\n');

        // Get the most recent call record
        const recentCall = await prisma.callRecord.findFirst({
            orderBy: { startTime: 'desc' },
            include: {
                contact: true
            }
        });

        if (!recentCall) {
            console.log('❌ No call records found');
            return;
        }

        console.log('📞 MOST RECENT CALL:');
        console.log(`Call ID: ${recentCall.callId}`);
        console.log(`Phone: ${recentCall.phoneNumber}`);
        console.log(`Contact ID: ${recentCall.contactId}`);
        console.log(`Linked Contact: ${recentCall.contact?.firstName || 'None'} ${recentCall.contact?.lastName || ''}`);
        console.log(`Contact Phone: ${recentCall.contact?.phone || 'N/A'}`);

        // Search for contacts with this phone number
        const phoneNumber = recentCall.phoneNumber;
        console.log(`\n🔍 Searching for contacts with phone: ${phoneNumber}`);

        // Try exact match
        const exactMatch = await prisma.contact.findMany({
            where: { phone: phoneNumber }
        });

        console.log(`Exact matches: ${exactMatch.length}`);
        exactMatch.forEach(contact => {
            console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.phone}) ID: ${contact.contactId}`);
        });

        // Try variations (the ones our phone matching should handle)
        const phoneVariations = [
            phoneNumber,
            phoneNumber.replace('+44', '0'),      // +447487723751 -> 07487723751
            phoneNumber.replace('+44', ''),       // +447487723751 -> 7487723751
            phoneNumber.replace('+', ''),         // +447487723751 -> 447487723751
        ];

        console.log('\n🔄 Trying phone number variations:');
        for (const variation of phoneVariations) {
            const matches = await prisma.contact.findMany({
                where: { phone: variation }
            });

            console.log(`${variation}: ${matches.length} matches`);
            matches.forEach(contact => {
                console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.phone}) ID: ${contact.contactId}`);
            });
        }

        // Check if there's a contact with similar phone (might be format issue)
        const similarContacts = await prisma.contact.findMany({
            where: {
                phone: {
                    contains: '7487723751'
                }
            }
        });

        console.log(`\n🎯 Contacts containing "7487723751": ${similarContacts.length}`);
        similarContacts.forEach(contact => {
            console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.phone}) ID: ${contact.contactId}`);
        });

    } catch (error) {
        console.error('Error checking contact linkage:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkContactLinkage();