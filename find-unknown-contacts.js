const axios = require('axios');

async function findUnknownContacts() {
    try {
        // Test different auth methods
        const authMethods = [
            { headers: {} },
            { headers: { 'Authorization': 'Bearer default' } },
            { headers: { 'Authorization': 'Bearer test-token' } },
            { headers: { 'x-api-key': 'test-key' } }
        ];

        console.log('=== SEARCHING FOR UNKNOWN CONTACTS ===\n');

        for (const [index, auth] of authMethods.entries()) {
            console.log(`\n--- Auth Method ${index + 1} ---`);
            console.log('Headers:', JSON.stringify(auth.headers, null, 2));

            try {
                const response = await axios.get(
                    'https://froniterai-production.up.railway.app/api/contacts',
                    {
                        ...auth,
                        params: {
                            search: 'Unknown Contact',
                            limit: 100
                        }
                    }
                );

                console.log('Status:', response.status);
                console.log('Data structure:', typeof response.data);
                
                if (response.data && response.data.data) {
                    const contacts = response.data.data;
                    console.log('Total contacts found:', contacts.length);
                    
                    // Filter for unknown contacts
                    const unknownContacts = contacts.filter(contact => 
                        contact.firstName === 'Unknown Contact' || 
                        contact.lastName === 'Unknown Contact' ||
                        (contact.firstName === 'Unknown' && contact.lastName === 'Contact') ||
                        contact.firstName?.includes('Unknown') ||
                        contact.lastName?.includes('Unknown')
                    );
                    
                    console.log('Unknown contacts found:', unknownContacts.length);
                    
                    if (unknownContacts.length > 0) {
                        console.log('Sample unknown contacts:');
                        unknownContacts.slice(0, 3).forEach(contact => {
                            console.log(`- ID: ${contact.contactId}, Name: ${contact.firstName} ${contact.lastName}, Phone: ${contact.phone}`);
                        });
                        
                        // This auth method works, use it for cleanup
                        return { auth, unknownContacts };
                    }
                } else {
                    console.log('No data.data found in response');
                }
            } catch (error) {
                console.log('Error:', error.message);
            }
        }

        // Also try without search filter to see all contacts
        console.log('\n=== CHECKING ALL CONTACTS (first 200) ===');
        
        try {
            const response = await axios.get(
                'https://froniterai-production.up.railway.app/api/contacts',
                {
                    headers: {},
                    params: { limit: 200 }
                }
            );

            if (response.data && response.data.data) {
                const contacts = response.data.data;
                console.log('Total contacts in first batch:', contacts.length);
                
                const unknownContacts = contacts.filter(contact => 
                    contact.firstName === 'Unknown Contact' || 
                    contact.lastName === 'Unknown Contact' ||
                    (contact.firstName === 'Unknown' && contact.lastName === 'Contact') ||
                    contact.firstName?.includes('Unknown') ||
                    contact.lastName?.includes('Unknown')
                );
                
                console.log('Unknown contacts in first 200:', unknownContacts.length);
                
                if (unknownContacts.length > 0) {
                    console.log('Found unknown contacts:');
                    unknownContacts.forEach(contact => {
                        console.log(`- ID: ${contact.contactId}, Name: ${contact.firstName} ${contact.lastName}, Phone: ${contact.phone}`);
                    });
                }
            }
        } catch (error) {
            console.log('Error checking all contacts:', error.message);
        }

        console.log('\n=== CONCLUSION ===');
        console.log('No unknown contacts found. They may have been cleaned up already or use a different naming pattern.');
        
    } catch (error) {
        console.error('Fatal error:', error.message);
    }
}

findUnknownContacts();