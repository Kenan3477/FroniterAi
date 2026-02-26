const axios = require('axios');

async function findAndCleanUnknownContacts() {
    try {
        console.log('🔍 Fetching all contacts to find unknown contacts...\n');

        const API_BASE = 'https://froniterai-production.up.railway.app';
        let allUnknownContacts = [];
        let page = 1;
        let hasMorePages = true;

        while (hasMorePages) {
            console.log(`📄 Fetching page ${page}...`);
            
            const response = await axios.get(`${API_BASE}/api/contacts`, {
                params: { 
                    page: page,
                    limit: 100 
                }
            });

            if (response.status === 200 && response.data && response.data.data && response.data.data.contacts) {
                const contacts = response.data.data.contacts;
                console.log(`   Found ${contacts.length} contacts on page ${page}`);
                
                // Filter for unknown contacts with various naming patterns
                const unknownContactsOnPage = contacts.filter(contact => {
                    const firstName = contact.firstName || '';
                    const lastName = contact.lastName || '';
                    const fullName = `${firstName} ${lastName}`.toLowerCase();
                    
                    return (
                        firstName === 'Unknown Contact' || 
                        lastName === 'Unknown Contact' ||
                        (firstName === 'Unknown' && lastName === 'Contact') ||
                        firstName.includes('Unknown') ||
                        lastName.includes('Unknown') ||
                        fullName.includes('unknown contact') ||
                        fullName === 'unknown unknown' ||
                        firstName === 'Unknown' ||
                        lastName === 'Unknown'
                    );
                });
                
                if (unknownContactsOnPage.length > 0) {
                    console.log(`   ⚠️  Found ${unknownContactsOnPage.length} unknown contacts on page ${page}`);
                    allUnknownContacts.push(...unknownContactsOnPage);
                    
                    // Show samples
                    unknownContactsOnPage.slice(0, 3).forEach(contact => {
                        console.log(`      - ID: ${contact.contactId}, Name: "${contact.firstName} ${contact.lastName}", Phone: ${contact.phone}`);
                    });
                }
                
                // Check if there are more pages
                if (response.data.data.pagination) {
                    hasMorePages = page < response.data.data.pagination.totalPages;
                    console.log(`   📊 Page ${page} of ${response.data.data.pagination.totalPages} (Total contacts: ${response.data.data.pagination.total})`);
                } else {
                    hasMorePages = contacts.length === 100; // Assume more pages if we got a full batch
                }
                
                page++;
            } else {
                console.log('❌ Failed to get contacts or unexpected response structure');
                break;
            }
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`Total unknown contacts found: ${allUnknownContacts.length}`);
        
        if (allUnknownContacts.length === 0) {
            console.log('✅ No unknown contacts found! The system is clean.');
            return;
        }

        // Show all unknown contacts found
        console.log('\n📋 All unknown contacts:');
        allUnknownContacts.forEach((contact, index) => {
            console.log(`${index + 1}. ID: ${contact.contactId}, Name: "${contact.firstName} ${contact.lastName}", Phone: ${contact.phone}, Created: ${contact.createdAt}`);
        });

        console.log(`\n🗑️  Starting cleanup of ${allUnknownContacts.length} unknown contacts...\n`);

        let deletedCount = 0;
        let failedDeletes = [];

        for (const contact of allUnknownContacts) {
            try {
                console.log(`Deleting contact ${contact.contactId} (${contact.firstName} ${contact.lastName})...`);
                
                const deleteResponse = await axios.delete(`${API_BASE}/api/contacts/${contact.contactId}`);
                
                if (deleteResponse.status === 200 || deleteResponse.status === 204) {
                    deletedCount++;
                    console.log(`   ✅ Deleted successfully`);
                } else {
                    failedDeletes.push({
                        id: contact.contactId,
                        name: `${contact.firstName} ${contact.lastName}`,
                        error: `Status: ${deleteResponse.status}`
                    });
                    console.log(`   ❌ Delete failed with status: ${deleteResponse.status}`);
                }
                
                // Small delay between deletes to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                failedDeletes.push({
                    id: contact.contactId,
                    name: `${contact.firstName} ${contact.lastName}`,
                    error: error.message
                });
                console.log(`   ❌ Delete failed: ${error.message}`);
            }
        }

        console.log(`\n🏁 CLEANUP COMPLETE:`);
        console.log(`✅ Successfully deleted: ${deletedCount} contacts`);
        console.log(`❌ Failed to delete: ${failedDeletes.length} contacts`);
        
        if (failedDeletes.length > 0) {
            console.log('\nFailed deletes:');
            failedDeletes.forEach(fail => {
                console.log(`- ${fail.id} (${fail.name}): ${fail.error}`);
            });
        }

    } catch (error) {
        console.error('Fatal error:', error.message);
    }
}

findAndCleanUnknownContacts();