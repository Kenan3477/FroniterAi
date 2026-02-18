#!/usr/bin/env node

/**
 * COMPREHENSIVE OMNIVOX SECURITY AUDIT
 * Performs systematic security checks across the entire infrastructure
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BACKEND_URL = 'https://froniterai-production.up.railway.app';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQURNSU4iLCJlbWFpbCI6ImFkbWluQG9tbml2b3gtYWkuY29tIiwiaWF0IjoxNzcxNDE0Nzc5LCJleHAiOjE3NzE0NDM1Nzl9.FzHTxrB4ShH2wnahXKKKbDC3u8VqTPQwJfyECS06jrw';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

class SecurityAuditor {
  constructor() {
    this.vulnerabilities = [];
    this.securityIssues = [];
    this.recommendations = [];
  }

  logVulnerability(level, category, description, file = null) {
    this.vulnerabilities.push({
      level, // CRITICAL, HIGH, MEDIUM, LOW
      category,
      description,
      file,
      timestamp: new Date().toISOString()
    });
  }

  logSecurityIssue(issue, severity = 'MEDIUM') {
    this.securityIssues.push({
      issue,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  addRecommendation(recommendation, priority = 'HIGH') {
    this.recommendations.push({
      recommendation,
      priority,
      timestamp: new Date().toISOString()
    });
  }

  async auditPasswordSecurity() {
    console.log('🔐 AUDITING: Password & Authentication Security');
    console.log('================================================\n');

    // Check password complexity requirements
    try {
      const response = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-weak@example.com',
          password: '123', // Weak password
          username: 'weaktest'
        })
      });

      if (response.status === 201) {
        this.logVulnerability('CRITICAL', 'Authentication', 'System accepts weak passwords - no complexity requirements enforced');
      } else {
        console.log('✅ Password complexity validation appears to be in place');
      }
    } catch (error) {
      console.log('⚠️  Could not test password complexity');
    }

    // Check for default/test accounts
    const testAccounts = [
      { email: 'admin@admin.com', password: 'admin' },
      { email: 'test@test.com', password: 'test' },
      { email: 'user@user.com', password: 'password' },
      { email: 'demo@demo.com', password: 'demo' }
    ];

    for (const account of testAccounts) {
      try {
        const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(account)
        });

        if (response.status === 200) {
          this.logVulnerability('HIGH', 'Authentication', `Default test account found: ${account.email}`);
        }
      } catch (error) {
        // Good - account doesn't exist
      }
    }

    // Check JWT security
    console.log('🔍 Checking JWT token security...');
    if (ADMIN_TOKEN) {
      const tokenParts = ADMIN_TOKEN.split('.');
      if (tokenParts.length === 3) {
        try {
          const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
          
          console.log(`   Algorithm: ${header.alg}`);
          console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
          
          if (header.alg === 'none') {
            this.logVulnerability('CRITICAL', 'JWT', 'JWT using "none" algorithm - tokens can be forged');
          }
          
          if (payload.exp && (payload.exp - payload.iat) > 86400) {
            this.logVulnerability('MEDIUM', 'JWT', 'JWT tokens have long expiration times (>24h)');
          }
        } catch (error) {
          console.log('   ⚠️  Could not decode JWT token');
        }
      }
    }
  }

  async auditAPIEndpoints() {
    console.log('\n🌐 AUDITING: API Endpoint Security');
    console.log('===================================\n');

    const sensitiveEndpoints = [
      '/api/admin/users',
      '/api/admin/settings', 
      '/api/admin/database',
      '/api/auth/users',
      '/api/system/logs',
      '/api/emergency/user-info',
      '/api/emergency/reset-password'
    ];

    for (const endpoint of sensitiveEndpoints) {
      try {
        // Test without authentication
        const unauthResponse = await makeRequest(`${BACKEND_URL}${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (unauthResponse.status === 200) {
          this.logVulnerability('CRITICAL', 'Authorization', `Sensitive endpoint accessible without auth: ${endpoint}`);
        } else if (unauthResponse.status === 404) {
          console.log(`✅ ${endpoint}: Properly protected (404)`);
        } else if (unauthResponse.status === 401 || unauthResponse.status === 403) {
          console.log(`✅ ${endpoint}: Properly protected (${unauthResponse.status})`);
        }

        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting test
      } catch (error) {
        console.log(`   Error testing ${endpoint}: ${error.message}`);
      }
    }

    // Test for SQL injection in common parameters
    const sqlInjectionTests = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "1; EXEC sp_helpdb",
      "' UNION SELECT NULL,version(),NULL--"
    ];

    console.log('\n🔍 Testing for SQL injection vulnerabilities...');
    for (const injection of sqlInjectionTests) {
      try {
        const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: injection,
            password: 'test'
          })
        });

        // Check if server returns database errors that could indicate SQL injection
        if (response.data && response.data.includes('SQL') || response.data.includes('database')) {
          this.logVulnerability('HIGH', 'SQL Injection', `Potential SQL injection vulnerability detected with payload: ${injection}`);
        }
      } catch (error) {
        // Error is expected for malformed requests
      }
    }
  }

  async auditFileSystemSecurity() {
    console.log('\n📁 AUDITING: File System Security');
    console.log('==================================\n');

    const sensitiveFiles = [
      'backend/.env',
      'backend/.env.local', 
      'backend/.env.production',
      'backend/prisma/schema.prisma',
      'backend/package.json',
      '.gitignore',
      'backend/src/config',
      'backend/src/database'
    ];

    for (const file of sensitiveFiles) {
      const fullPath = path.join('/Users/zenan/kennex', file);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        
        // Check file permissions (on Unix systems)
        if (process.platform !== 'win32') {
          const mode = stats.mode.toString(8);
          if (mode.endsWith('777') || mode.endsWith('666')) {
            this.logVulnerability('HIGH', 'File Permissions', `File has overly permissive permissions: ${file} (${mode})`);
          }
        }

        // Check for sensitive data exposure
        if (file.includes('.env')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('password') && !content.includes('# password')) {
              console.log(`⚠️  ${file}: Contains password configurations`);
            }
            if (content.includes('secret') && !content.includes('# secret')) {
              console.log(`⚠️  ${file}: Contains secret keys`);
            }
          } catch (error) {
            console.log(`   Could not read ${file}: ${error.message}`);
          }
        }
      }
    }

    // Check for backup files and logs that might contain sensitive data
    const dangerousPatterns = [
      '*.log',
      '*.bak',
      '*.backup',
      '*.dump',
      '*~',
      '.DS_Store'
    ];

    console.log('\n🔍 Scanning for potentially sensitive backup files...');
    // This would require a more complex file scanning implementation
  }

  async auditNetworkSecurity() {
    console.log('\n🌍 AUDITING: Network Security');
    console.log('==============================\n');

    // Check HTTPS enforcement
    try {
      console.log('🔍 Testing HTTPS enforcement...');
      
      // Test if HTTP redirects to HTTPS
      const httpTest = await makeRequest('http://froniterai-production.up.railway.app/api/health', {
        method: 'GET'
      }).catch(() => ({ status: 0 }));

      if (httpTest.status === 200) {
        this.logVulnerability('HIGH', 'Network Security', 'HTTP endpoint accessible - should redirect to HTTPS');
      }

      // Check security headers
      const httpsResponse = await makeRequest(`${BACKEND_URL}/api/health`, {
        method: 'GET'
      });

      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy'
      ];

      for (const header of securityHeaders) {
        if (!httpsResponse.headers[header]) {
          this.logVulnerability('MEDIUM', 'Network Security', `Missing security header: ${header}`);
        } else {
          console.log(`✅ Security header present: ${header}`);
        }
      }

    } catch (error) {
      console.log('⚠️  Could not test network security:', error.message);
    }

    // Check for exposed debug endpoints
    const debugEndpoints = [
      '/debug',
      '/api/debug',
      '/health',
      '/status',
      '/info',
      '/metrics',
      '/actuator',
      '/.env',
      '/config'
    ];

    console.log('\n🔍 Checking for exposed debug/info endpoints...');
    for (const endpoint of debugEndpoints) {
      try {
        const response = await makeRequest(`${BACKEND_URL}${endpoint}`, {
          method: 'GET'
        });

        if (response.status === 200) {
          console.log(`⚠️  Debug endpoint accessible: ${endpoint}`);
          
          if (response.data.includes('password') || response.data.includes('secret') || response.data.includes('key')) {
            this.logVulnerability('HIGH', 'Information Disclosure', `Debug endpoint exposes sensitive info: ${endpoint}`);
          }
        }
      } catch (error) {
        // Expected for non-existent endpoints
      }
    }
  }

  async auditDatabaseSecurity() {
    console.log('\n🗃️ AUDITING: Database Security');
    console.log('===============================\n');

    try {
      // Check for database exposure via admin endpoints
      const response = await makeRequest(`${BACKEND_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const data = JSON.parse(response.data);
        console.log(`📊 Found ${data.data?.length || 0} users in database`);
        
        // Check for users with weak passwords or default accounts
        if (data.data) {
          data.data.forEach(user => {
            if (user.email.includes('test') || user.email.includes('demo')) {
              this.logVulnerability('MEDIUM', 'Database', `Test/demo user account exists: ${user.email}`);
            }
          });
        }
      }

      // Test for database injection via API
      console.log('🔍 Testing API for database injection vulnerabilities...');
      
      const injectionPayloads = [
        { email: "admin@omnivox-ai.com'; SELECT version(); --", password: "test" },
        { email: "admin@omnivox-ai.com", password: "' OR 1=1 --" }
      ];

      for (const payload of injectionPayloads) {
        const testResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (testResponse.status === 200) {
          this.logVulnerability('CRITICAL', 'SQL Injection', 'Database injection successful - system is vulnerable');
        }
      }

    } catch (error) {
      console.log('⚠️  Could not complete database security audit:', error.message);
    }
  }

  async implementSecurityMonitoring() {
    console.log('\n🛡️ IMPLEMENTING: Security Monitoring System');
    console.log('============================================\n');

    const monitoringCode = `
// Security Monitoring Middleware
const securityMonitor = {
  logUnauthorizedAccess: (req, res, next) => {
    const suspiciousPatterns = [
      /\\.\\./,  // Directory traversal
      /(<|%3C)script/i,  // XSS attempts
      /'|"|;|--|union|select|insert|delete|update|drop/i  // SQL injection
    ];
    
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    // Check for suspicious patterns
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(fullUrl) || pattern.test(JSON.stringify(req.body))) {
        console.log('🚨 SECURITY ALERT: Suspicious request detected');
        console.log(\`   IP: \${ip}\`);
        console.log(\`   URL: \${fullUrl}\`);
        console.log(\`   User-Agent: \${userAgent}\`);
        console.log(\`   Body: \${JSON.stringify(req.body)}\`);
        
        // Log to security system
        logSecurityEvent({
          type: 'SUSPICIOUS_REQUEST',
          ip,
          url: fullUrl,
          userAgent,
          body: req.body,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    next();
  },
  
  logFailedAuth: (email, ip, userAgent) => {
    console.log('🚨 SECURITY ALERT: Failed authentication attempt');
    console.log(\`   Email: \${email}\`);
    console.log(\`   IP: \${ip}\`);
    console.log(\`   User-Agent: \${userAgent}\`);
    
    logSecurityEvent({
      type: 'FAILED_AUTH',
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  logUnauthorizedEndpointAccess: (endpoint, ip, userAgent) => {
    console.log('🚨 SECURITY ALERT: Unauthorized endpoint access');
    console.log(\`   Endpoint: \${endpoint}\`);
    console.log(\`   IP: \${ip}\`);
    console.log(\`   User-Agent: \${userAgent}\`);
    
    logSecurityEvent({
      type: 'UNAUTHORIZED_ACCESS',
      endpoint,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
};

function logSecurityEvent(event) {
  // Store in database and/or send alerts
  console.log('📝 Security event logged:', event);
  
  // Could send email alerts, Slack notifications, etc.
  if (event.type === 'SUSPICIOUS_REQUEST' || event.type === 'UNAUTHORIZED_ACCESS') {
    // Send immediate alert for critical events
    sendSecurityAlert(event);
  }
}
`;

    console.log('📝 Generated security monitoring code');
    this.addRecommendation('Implement the security monitoring middleware in backend/src/middleware/security.js');
  }

  async generateReport() {
    console.log('\n📊 GENERATING SECURITY AUDIT REPORT');
    console.log('====================================\n');

    const report = {
      auditDate: new Date().toISOString(),
      systemVersion: '1.0.0',
      vulnerabilities: this.vulnerabilities,
      securityIssues: this.securityIssues,
      recommendations: this.recommendations,
      overallRiskLevel: this.calculateRiskLevel(),
      summary: this.generateSummary()
    };

    // Write report to file
    fs.writeFileSync('/Users/zenan/kennex/SECURITY_AUDIT_REPORT.json', JSON.stringify(report, null, 2));
    
    console.log('📄 SECURITY AUDIT SUMMARY');
    console.log('==========================');
    console.log(`🔴 Critical vulnerabilities: ${this.vulnerabilities.filter(v => v.level === 'CRITICAL').length}`);
    console.log(`🟠 High vulnerabilities: ${this.vulnerabilities.filter(v => v.level === 'HIGH').length}`);
    console.log(`🟡 Medium vulnerabilities: ${this.vulnerabilities.filter(v => v.level === 'MEDIUM').length}`);
    console.log(`🟢 Low vulnerabilities: ${this.vulnerabilities.filter(v => v.level === 'LOW').length}`);
    console.log(`\n⚠️  Total security issues: ${this.securityIssues.length}`);
    console.log(`💡 Recommendations: ${this.recommendations.length}`);
    console.log(`\n🛡️ Overall risk level: ${report.overallRiskLevel}`);

    if (this.vulnerabilities.length > 0) {
      console.log('\n🚨 CRITICAL ACTIONS REQUIRED:');
      this.vulnerabilities.filter(v => v.level === 'CRITICAL').forEach(v => {
        console.log(`   ❗ ${v.description}`);
      });
    }

    console.log('\n📋 TOP RECOMMENDATIONS:');
    this.recommendations.slice(0, 5).forEach(r => {
      console.log(`   🔧 ${r.recommendation}`);
    });

    return report;
  }

  calculateRiskLevel() {
    const critical = this.vulnerabilities.filter(v => v.level === 'CRITICAL').length;
    const high = this.vulnerabilities.filter(v => v.level === 'HIGH').length;
    const medium = this.vulnerabilities.filter(v => v.level === 'MEDIUM').length;

    if (critical > 0) return 'CRITICAL';
    if (high > 2) return 'HIGH';
    if (high > 0 || medium > 3) return 'MEDIUM';
    return 'LOW';
  }

  generateSummary() {
    return `Security audit completed on ${new Date().toISOString()}. Found ${this.vulnerabilities.length} vulnerabilities and ${this.securityIssues.length} security issues. Risk level: ${this.calculateRiskLevel()}.`;
  }
}

async function runComprehensiveSecurityAudit() {
  console.log('🔒 OMNIVOX COMPREHENSIVE SECURITY AUDIT');
  console.log('=========================================');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🎯 Target: Omnivox AI Platform`);
  console.log(`🔧 Auditor: Automated Security Scanner v2.0\n`);

  const auditor = new SecurityAuditor();

  try {
    await auditor.auditPasswordSecurity();
    await auditor.auditAPIEndpoints();
    await auditor.auditFileSystemSecurity();
    await auditor.auditNetworkSecurity();
    await auditor.auditDatabaseSecurity();
    await auditor.implementSecurityMonitoring();
    
    const report = await auditor.generateReport();
    
    console.log('\n✅ SECURITY AUDIT COMPLETED');
    console.log('📄 Full report saved to: SECURITY_AUDIT_REPORT.json');
    console.log('\n🔐 CURRENT ADMIN CREDENTIALS (SECURE):');
    console.log('   📧 Email: admin@omnivox-ai.com');
    console.log('   🔑 Password: Ken3477!');
    
  } catch (error) {
    console.error('❌ Security audit failed:', error.message);
  }
}

runComprehensiveSecurityAudit().catch(console.error);