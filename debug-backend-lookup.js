/**
 * Debug Backend Disposition Lookup
 * Directly test the Prisma disposition lookup
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBackendLookup() {
    console.log('🔍 DEBUGGING BACKEND DISPOSITION LOOKUP');
    
    try {
        // 1. List all dispositions
        console.log('\n1. All dispositions in database:');
        const allDispositions = await prisma.disposition.findMany({
            orderBy: { name: 'asc' }
        });
        allDispositions.forEach(d => {
            console.log(`   - ID: ${d.id} | Name: ${d.name}`);
        });
        
        if (allDispositions.length === 0) {
            console.log('❌ No dispositions found');
            return;
        }
        
        // 2. Test findUnique with exact ID
        const testId = allDispositions[0].id;
        console.log(`\n2. Testing findUnique with ID: ${testId}`);
        
        const foundDisposition = await prisma.disposition.findUnique({
            where: { id: testId }
        });
        
        if (foundDisposition) {
            console.log(`✅ Found: ${foundDisposition.name} (${foundDisposition.id})`);
        } else {
            console.log('❌ Not found via findUnique');
        }
        
        // 3. Test the exact validation logic from the endpoint
        console.log('\n3. Testing exact validation logic...');
        
        const disposition = {
            id: testId,
            name: 'Test Disposition',
            outcome: 'completed'
        };
        const dispositionId = testId;
        
        let validDispositionId = null;
        if (disposition?.id || dispositionId) {
            const dispositionIdToCheck = disposition?.id || dispositionId;
            console.log(`   Checking ID: ${dispositionIdToCheck}`);
            
            try {
                const existingDisposition = await prisma.disposition.findUnique({
                    where: { id: dispositionIdToCheck }
                });
                if (existingDisposition) {
                    validDispositionId = dispositionIdToCheck;
                    console.log(`   ✅ Valid disposition found: ${existingDisposition.name}`);
                } else {
                    console.log(`   ⚠️ Disposition not found, proceeding without dispositionId: ${dispositionIdToCheck}`);
                }
            } catch (dispositionError) {
                console.log(`   ⚠️ Disposition validation failed: ${dispositionError.message}`);
            }
        }
        
        console.log(`\n4. Final validDispositionId: ${validDispositionId}`);
        
    } catch (error) {
        console.error('❌ DEBUG FAILED:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

debugBackendLookup();