const jwt = require('jsonwebtoken');

// First, let's create a proper JWT token using the same secret as the backend
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-replace-in-production';

// Create a token for admin purposes
const adminToken = jwt.sign(
  {
    userId: 509, // Using the existing user ID we know exists
    role: 'admin' // Assuming admin role
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Generated admin token:', adminToken);

// Define the missing disposition types
const dispositionTypes = [
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

// Function to create disposition types
async function createDispositionTypes() {
  const fetch = (await import('node-fetch')).default;
  
  // Determine the backend URL
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
  try {
    console.log('Creating disposition types...');
    
    const response = await fetch(`${backendUrl}/api/dispositions/create-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ dispositions: dispositionTypes })
    });
    
    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Successfully created disposition types!');
    } else {
      console.log('❌ Failed to create disposition types');
    }
  } catch (error) {
    console.error('Error creating disposition types:', error);
  }
}

// Also try to create them directly in the database
async function createDirectly() {
  try {
    // Try to connect to the database directly
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('Attempting direct database creation...');
    
    for (const disposition of dispositionTypes) {
      try {
        await prisma.disposition.create({
          data: disposition
        });
        console.log(`✅ Created disposition: ${disposition.id}`);
      } catch (error) {
        console.log(`❌ Failed to create ${disposition.id}:`, error.message);
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Direct database creation failed:', error.message);
  }
}

// Run both methods
async function main() {
  console.log('=== Creating Missing Disposition Types ===\n');
  
  console.log('Method 1: Using API with JWT token');
  await createDispositionTypes();
  
  console.log('\nMethod 2: Direct database creation');
  await createDirectly();
}

main().catch(console.error);