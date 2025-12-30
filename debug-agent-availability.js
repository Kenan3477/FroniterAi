#!/usr/bin/env node

/**
 * Debug agent availability for inbound calls
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAgentAvailability() {
    console.log('🔍 Debugging agent availability for inbound calls...\n');
    
    try {
        // Check all agents in database
        console.log('📋 All agents in database:');
        const allAgents = await prisma.agents.findMany({
            select: {
                agentId: true,
                firstName: true,
                lastName: true,
                status: true,
                isLoggedIn: true,
                createdAt: true
            }
        });
        
        if (allAgents.length === 0) {
            console.log('❌ No agents found in database!');
        } else {
            allAgents.forEach(agent => {
                console.log(`  ${agent.agentId}: ${agent.firstName} ${agent.lastName} - Status: ${agent.status}, Logged In: ${agent.isLoggedIn}`);
            });
        }
        
        console.log('\n📞 Available agents for inbound calls:');
        const availableAgents = await prisma.$queryRaw`
          SELECT a."agentId", a."firstName", a."lastName", a.status, a."isLoggedIn"
          FROM agents a
          WHERE a.status = 'Available'
            AND a."isLoggedIn" = true
        `;
        
        if (availableAgents.length === 0) {
            console.log('❌ No available agents found!');
            console.log('💡 Agents need status="Available" AND isLoggedIn=true');
        } else {
            availableAgents.forEach(agent => {
                console.log(`  ✅ ${agent.agentId}: ${agent.firstName} ${agent.lastName}`);
            });
        }
        
        // Check users table as well (might be used for authentication)
        console.log('\n👥 Users in database:');
        const users = await prisma.users.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true
            }
        });
        
        if (users.length === 0) {
            console.log('❌ No users found!');
        } else {
            users.forEach(user => {
                console.log(`  ${user.id}: ${user.email} - Role: ${user.role}, Active: ${user.isActive}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error debugging agents:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the debug
if (require.main === module) {
    debugAgentAvailability().catch(console.error);
}

module.exports = { debugAgentAvailability };