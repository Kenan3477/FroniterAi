#!/usr/bin/env node
/**
 * CRITICAL FIX: Replace all PrismaClient instances with singleton
 * 
 * This script fixes the "too many database connections" error by replacing
 * all `new PrismaClient()` instances with a centralized singleton import.
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'backend/src/services/overviewDashboardService.ts',
  'backend/src/middleware/organizationSecurity.ts',
  'backend/src/middleware/enhancedAuth.ts',
  'backend/src/middleware/organizationAuth.ts',
  'backend/src/routes/campaignManagement.ts',
  'backend/src/routes/users.ts',
  'backend/src/services/emailService.ts',
  'backend/src/routes/passwordSetup.ts',
  'backend/src/services/realBusinessSettingsService.ts',
  'backend/src/middleware/auth.ts',
  'backend/src/routes/updateOrgAdmin.ts',
  'backend/src/services/advancedAuditService.ts',
  'backend/src/routes/simpleBusinessSettings.ts',
  'backend/src/routes/verySimpleBusinessSettings.ts',
  'backend/src/services/adaptiveQuickActionsService.ts',
  'backend/src/services/advancedAdaptiveService.ts',
  'backend/src/services/universalQuickActionsService.ts',
  'backend/src/routes/adminSetup.ts',
  'backend/src/controllers/advancedReportsController.ts',
  'backend/src/ai/RealTimeAIScoringEngine.ts',
  'backend/src/ai/AutomatedDispositionEngine.ts',
  'backend/src/controllers/autoDispositionController.ts',
  'backend/src/services/sentimentAnalysisService.ts',
  'backend/src/controllers/integrationController.ts',
  'backend/src/controllers/stripeController.ts',
  'backend/src/routes/voiceRoutes.ts',
  'backend/src/routes/dashboard.ts',
  'backend/src/services/flowExecutionEngine.ts',
  'backend/src/services/autoDialEngine.ts',
  'backend/src/services/flowMonitoringService.ts',
  'backend/src/services/leadLifecycleService.ts',
  'backend/src/services/integrationDataConsistencyService.ts',
  'backend/src/routes/enhancedRecordingRoutes.ts',
  'backend/src/services/autoDialSentimentMonitor.ts',
  'backend/src/services/flowOptimizationService.ts',
  'backend/src/services/autoDispositionService.ts',
  'backend/src/services/transcriptionWorker.ts',
  'backend/src/services/realKpiService.ts',
  'backend/src/routes/agents.ts',
  'backend/src/controllers/nodeTypes.ts',
  'backend/src/controllers/flowOptimization.ts',
  'backend/src/controllers/multiTenantFlow.ts',
  'backend/src/routes/admin/dnc.ts',
  'backend/src/routes/agent.ts',
  'backend/src/routes/dnc.ts',
  'backend/src/controllers/flows.ts',
  'backend/src/controllers/leadScoringController.ts',
  'backend/src/routes/inboundQueueRoutes.ts',
  'backend/src/controllers/adminController.ts',
  'backend/src/controllers/flowVersions.ts',
  'backend/src/services/flowVersioningService.ts',
  'backend/src/services/agentService.ts',
  'backend/src/services/queueService.ts',
  'backend/src/services/realReportsService.ts',
];

let filesFixed = 0;
let filesSkipped = 0;
let errors = 0;

console.log('🔧 PRISMA SINGLETON FIX - Replacing all PrismaClient instances\n');
console.log('=' .repeat(80));

for (const relPath of filesToFix) {
  const filePath = path.join('/Users/zenan/kennex', relPath);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  SKIP: ${relPath} (file not found)`);
      filesSkipped++;
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Check if already using singleton
    if (content.includes("from '../lib/prisma'") || content.includes('from "../lib/prisma"')) {
      console.log(`✓ SKIP: ${relPath} (already using singleton)`);
      filesSkipped++;
      continue;
    }
    
    // Replace PrismaClient import
    content = content.replace(
      /import\s+{\s*PrismaClient\s*}\s+from\s+['"]@prisma\/client['"]\s*;?\s*\n/g,
      ''
    );
    
    // Replace const prisma = new PrismaClient(); declarations
    content = content.replace(
      /const\s+prisma\s*=\s*new\s+PrismaClient\(\s*\)\s*;?\s*\n/g,
      ''
    );
    
    // Calculate relative path to lib/prisma
    const depth = relPath.split('/').length - 3; // Subtract 'backend/src/filename.ts'
    const relativePath = '../'.repeat(depth) + 'lib/prisma';
    
    // Add singleton import after other imports
    const importRegex = /(import\s+.*from\s+['"].*['"]\s*;?\s*\n)/g;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]);
      const insertPosition = lastImportIndex + imports[imports.length - 1].length;
      
      content = 
        content.slice(0, insertPosition) +
        `import { prisma } from '${relativePath}';\n` +
        content.slice(insertPosition);
    } else {
      // No imports found, add at the top after comments
      const firstLineRegex = /^(?:\/\/.*\n|\/\*[\s\S]*?\*\/\n)*/;
      const match = content.match(firstLineRegex);
      const insertPosition = match ? match[0].length : 0;
      
      content =
        content.slice(0, insertPosition) +
        `import { prisma } from '${relativePath}';\n\n` +
        content.slice(insertPosition);
    }
    
    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ FIXED: ${relPath}`);
      filesFixed++;
    } else {
      console.log(`⚠️  SKIP: ${relPath} (no changes needed)`);
      filesSkipped++;
    }
    
  } catch (error) {
    console.error(`❌ ERROR: ${relPath} - ${error.message}`);
    errors++;
  }
}

console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY:');
console.log(`  ✅ Files Fixed: ${filesFixed}`);
console.log(`  ⚠️  Files Skipped: ${filesSkipped}`);
console.log(`  ❌ Errors: ${errors}`);
console.log('='.repeat(80));

if (filesFixed > 0) {
  console.log('\n🎉 SUCCESS! All files updated to use Prisma singleton.');
  console.log('\n📝 Next steps:');
  console.log('  1. Restart your backend server');
  console.log('  2. Test disposition saving');
  console.log('  3. Monitor database connections');
  console.log('\n  The "too many database connections" error should now be resolved!');
} else {
  console.log('\n⚠️  No files were modified. Check if files already use singleton.');
}
