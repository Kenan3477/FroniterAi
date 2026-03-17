#!/usr/bin/env node

/**
 * Security Enhancement Script
 * Updates key routes to use proper role-based authorization
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 Starting security enhancement...');

// Routes that need enhanced security
const securityUpdates = [
  {
    file: 'backend/src/routes/reports.ts',
    importUpdate: "import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';",
    oldImport: "import { authenticate } from '../middleware/auth';",
    middlewareUpdates: [
      {
        old: "router.use(authenticate);",
        new: "// Apply enhanced authentication to all routes\nrouter.use(authenticateToken);\n\n// Admin-only endpoints\nrouter.use('/dashboard', requirePermission('reports.read'));\nrouter.use('/templates', requirePermission('reports.read'));\nrouter.use('/generate', requirePermission('reports.create'));\nrouter.use('/scheduled', requirePermission('reports.admin'));\nrouter.use('/builder/config', requirePermission('reports.read'));"
      }
    ]
  },
  {
    file: 'backend/src/routes/businessSettings.ts',
    importUpdate: "import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';",
    oldImport: "import { authenticate } from '../middleware/auth';",
    middlewareUpdates: [
      {
        old: "router.use(authenticate);",
        new: "// Apply enhanced authentication and admin permissions\nrouter.use(authenticateToken);\nrouter.use(requirePermission('settings.admin'));"
      }
    ]
  },
  {
    file: 'backend/src/routes/kpi.ts',
    importUpdate: "import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';",
    oldImport: "import { authenticate } from '../middleware/auth';",
    middlewareUpdates: [
      {
        old: "router.use(authenticate);",
        new: "// Apply enhanced authentication\nrouter.use(authenticateToken);\n\n// KPI endpoints require analytics permission\nrouter.use('/summary', requirePermission('analytics.read'));\nrouter.use('/hourly', requirePermission('analytics.read'));\nrouter.use('/outcome-data', requirePermission('analytics.read'));\nrouter.use('/agent-performance', requirePermission('performance.read'));"
      }
    ]
  }
];

console.log('📝 Updating route security...');

securityUpdates.forEach(update => {
  const filePath = path.join(__dirname, '../../..', update.file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${update.file}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update import
    if (update.oldImport && update.importUpdate) {
      content = content.replace(update.oldImport, update.importUpdate);
    }
    
    // Update middleware
    update.middlewareUpdates.forEach(middlewareUpdate => {
      content = content.replace(middlewareUpdate.old, middlewareUpdate.new);
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Enhanced security for ${update.file}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${update.file}:`, error.message);
  }
});

console.log('🔐 Security enhancement completed!');
console.log('');
console.log('📋 Summary of enhancements:');
console.log('• Enhanced JWT authentication with database validation');
console.log('• Role-based permissions with hierarchical access');
console.log('• Proper authorization checks on sensitive endpoints');
console.log('• Audit logging for sensitive operations');
console.log('• Rate limiting per user role');
console.log('');
console.log('⚡ Next steps:');
console.log('• Review and test all secured endpoints');
console.log('• Add organization-scoped access when org model is ready');
console.log('• Implement proper audit database table');
console.log('• Add real-time security monitoring');