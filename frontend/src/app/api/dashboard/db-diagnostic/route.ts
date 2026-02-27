import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/dashboard/db-diagnostic - Diagnostic endpoint to check database contents
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting database diagnostic...');

    const diagnostic: any = {
      database: 'unknown',
      tables: {},
      samples: {},
      errors: []
    };

    // Test 1: Check if we can connect to database
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
      diagnostic.database = 'connected';
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      diagnostic.database = 'failed';
      diagnostic.errors.push(`Connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 2: Check each table
    const tables = ['user', 'contact', 'campaign', 'callRecord'];
    
    for (const table of tables) {
      console.log(`🔍 Checking ${table} table...`);
      
      try {
        let count = 0;
        let sample = null;
        
        switch (table) {
          case 'user':
            count = await prisma.user.count();
            sample = await prisma.user.findFirst({
              select: { id: true, email: true, username: true, role: true, isActive: true }
            });
            break;
          case 'contact':
            count = await prisma.contact.count();
            sample = await prisma.contact.findFirst({
              select: { id: true, firstName: true, lastName: true, phone: true, email: true }
            });
            break;
          case 'campaign':
            count = await prisma.campaign.count();
            sample = await prisma.campaign.findFirst({
              select: { id: true, name: true, status: true }
            });
            break;
          case 'callRecord':
            count = await prisma.callRecord.count();
            sample = await prisma.callRecord.findFirst({
              select: { id: true, startTime: true, endTime: true, duration: true, outcome: true }
            });
            break;
        }
        
        diagnostic.tables[table] = { count, exists: true };
        diagnostic.samples[table] = sample;
        console.log(`✅ ${table}: ${count} records`);
        
      } catch (error) {
        console.error(`❌ Error checking ${table}:`, error);
        diagnostic.tables[table] = { count: 0, exists: false };
        diagnostic.errors.push(`${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 3: Check database info
    try {
      const dbInfo = await prisma.$queryRaw`SELECT version() as version`;
      diagnostic.database = { connected: true, info: dbInfo };
      console.log('📋 Database info:', dbInfo);
    } catch (error) {
      diagnostic.errors.push(`DB Info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      data: diagnostic
    });

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database diagnostic failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}