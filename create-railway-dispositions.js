#!/usr/bin/env node

/**
 * Create missing disposition types directly in Railway PostgreSQL database
 * This fixes the disposition save issues on the production Railway backend
 */

const { Client } = require('pg');

async function createMissingDispositionsOnRailway() {
    console.log('🚀 Creating missing disposition types in Railway database...\n');
    
    // Railway PostgreSQL connection (you'll need to get the actual connection string)
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@railway-postgres:5432/railway';
    
    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Railway PostgreSQL database');

        // The missing disposition types that need to be created
        const dispositions = [
            {
                id: 'disp_1766684993442',
                name: 'Customer Info Updated',
                description: 'Customer information was successfully updated'
            },
            {
                id: 'disp_1766684993443',
                name: 'Call Completed',
                description: 'Call was completed successfully'
            },
            {
                id: 'disp_1766684993444',
                name: 'No Answer',
                description: 'Customer did not answer the call'
            },
            {
                id: 'disp_1766684993445',
                name: 'Voicemail',
                description: 'Left a voicemail for the customer'
            },
            {
                id: 'disp_1766684993446',
                name: 'Busy Signal',
                description: 'Customer line was busy'
            }
        ];

        console.log('📋 Creating disposition types...');

        for (const disposition of dispositions) {
            try {
                // Check if disposition already exists
                const existingResult = await client.query(
                    'SELECT id FROM "Disposition" WHERE id = $1',
                    [disposition.id]
                );

                if (existingResult.rows.length > 0) {
                    console.log(`⏭️  Disposition ${disposition.id} already exists`);
                    continue;
                }

                // Create the disposition
                await client.query(`
                    INSERT INTO "Disposition" (id, name, description, "createdAt", "updatedAt")
                    VALUES ($1, $2, $3, NOW(), NOW())
                `, [disposition.id, disposition.name, disposition.description]);

                console.log(`✅ Created disposition: ${disposition.id} - ${disposition.name}`);
                
            } catch (error) {
                console.error(`❌ Failed to create ${disposition.id}:`, error.message);
            }
        }

        // Verify all dispositions exist
        console.log('\n📊 Verification - All dispositions in Railway database:');
        const allDispositions = await client.query('SELECT id, name FROM "Disposition" ORDER BY "createdAt" DESC');
        
        allDispositions.rows.forEach((row, index) => {
            const isNew = dispositions.some(d => d.id === row.id);
            const marker = isNew ? '🆕' : '  ';
            console.log(`${marker} ${row.id}: ${row.name}`);
        });

        console.log(`\n🎉 Total dispositions: ${allDispositions.rows.length}`);

        // Test the specific missing disposition
        const testDisposition = await client.query(
            'SELECT * FROM "Disposition" WHERE id = $1',
            ['disp_1766684993442']
        );

        if (testDisposition.rows.length > 0) {
            console.log('\n✅ SUCCESS: The missing disposition disp_1766684993442 is now available in Railway database!');
            console.log('🎯 Disposition save should now work on the production backend.');
        } else {
            console.log('\n❌ ISSUE: Disposition disp_1766684993442 still not found in Railway database');
        }

    } catch (error) {
        console.error('❌ Database operation failed:', error.message);
        console.log('\n📝 Note: You may need to provide the correct Railway PostgreSQL connection string');
        console.log('   Get it from: railway variables --service backend');
    } finally {
        await client.end();
    }
}

// Alternative method using Railway CLI
async function createUsingRailwayCLI() {
    console.log('\n🔧 Alternative: Using Railway CLI to execute database commands...');
    
    const { spawn } = require('child_process');
    
    const dispositions = [
        "('disp_1766684993442', 'Customer Info Updated', 'Customer information was successfully updated')",
        "('disp_1766684993443', 'Call Completed', 'Call was completed successfully')",
        "('disp_1766684993444', 'No Answer', 'Customer did not answer the call')",
        "('disp_1766684993445', 'Voicemail', 'Left a voicemail for the customer')",
        "('disp_1766684993446', 'Busy Signal', 'Customer line was busy')"
    ];
    
    const sql = `
        INSERT INTO "Disposition" (id, name, description, "createdAt", "updatedAt")
        VALUES ${dispositions.join(', ')}
        ON CONFLICT (id) DO NOTHING;
    `;
    
    console.log('SQL to execute:');
    console.log(sql);
    console.log('\nRun this in Railway dashboard or via CLI:');
    console.log('railway shell');
    console.log('then connect to PostgreSQL and run the above SQL');
}

async function main() {
    console.log('🎯 RAILWAY DISPOSITION TYPES CREATION');
    console.log('=====================================\n');
    
    await createMissingDispositionsOnRailway();
    await createUsingRailwayCLI();
}

if (require.main === module) {
    main().catch(console.error);
}