// Session cleanup utility to handle inactive sessions
const sessionCleanup = async () => {
  console.log('🧹 Session Cleanup: Starting inactive session cleanup...');
  
  const BACKEND_URL = 'https://froniterai-production.up.railway.app';
  
  try {
    // Use admin credentials to perform cleanup (you'll need to adjust these)
    const adminResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@omnivox.co.uk', // Your actual admin email
        password: 'your_admin_password' // Your actual admin password
      })
    });
    
    if (!adminResponse.ok) {
      console.log('❌ Admin login failed - cannot perform session cleanup');
      console.log('💡 Please update the admin credentials in this script');
      return;
    }
    
    const adminData = await adminResponse.json();
    const adminToken = adminData.token || adminData.data?.token;
    
    if (!adminToken) {
      console.log('❌ No admin token received');
      return;
    }
    
    console.log('✅ Admin authenticated for session cleanup');
    
    // Get all active sessions
    const sessionsResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?status=active&limit=100`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!sessionsResponse.ok) {
      console.log('❌ Failed to fetch active sessions');
      return;
    }
    
    const sessionsData = await sessionsResponse.json();
    const activeSessions = sessionsData.data?.sessions || [];
    
    console.log(`📊 Found ${activeSessions.length} active sessions`);
    
    const now = new Date();
    const inactiveThresholdHours = 24; // Mark sessions as inactive after 24 hours
    const cleanupThreshold = new Date(now.getTime() - (inactiveThresholdHours * 60 * 60 * 1000));
    
    let cleanedUpSessions = 0;
    
    for (const session of activeSessions) {
      const lastActivity = new Date(session.lastActivity || session.loginTime);
      
      if (lastActivity < cleanupThreshold) {
        console.log(`🧹 Cleaning up inactive session: ${session.sessionId}`);
        console.log(`   User: ${session.user?.email || 'Unknown'}`);
        console.log(`   Last Activity: ${lastActivity.toISOString()}`);
        console.log(`   Hours Inactive: ${((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)).toFixed(1)}`);
        
        // Update session to logged_out status with calculated duration
        const sessionDuration = Math.floor((cleanupThreshold.getTime() - new Date(session.loginTime).getTime()) / 1000);
        
        try {
          const cleanupResponse = await fetch(`${BACKEND_URL}/api/admin/sessions/${session.id}/cleanup`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'logged_out',
              logoutTime: cleanupThreshold.toISOString(),
              sessionDuration,
              logoutMethod: 'timeout_cleanup'
            }),
          });
          
          if (cleanupResponse.ok) {
            console.log(`   ✅ Session cleaned up successfully`);
            cleanedUpSessions++;
          } else {
            console.log(`   ⚠️ Failed to clean up session`);
          }
        } catch (error) {
          console.log(`   ❌ Error cleaning up session:`, error);
        }
      }
    }
    
    console.log(`🎯 Session cleanup complete: ${cleanedUpSessions} sessions cleaned up`);
    
    if (cleanedUpSessions > 0) {
      console.log('\n📊 Benefits of cleanup:');
      console.log('   - Accurate "Active Sessions" count in reports');
      console.log('   - Proper session durations calculated');  
      console.log('   - Clean audit trail without hanging sessions');
      console.log('   - Better system performance');
    }
    
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
  }
};

// Auto-run cleanup if called directly
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

console.log('🔧 Session Cleanup Utility');
console.log('📋 This script will:');
console.log('   1. Find sessions inactive for >24 hours');
console.log('   2. Mark them as logged_out with proper duration');
console.log('   3. Clean up your session tracking data');
console.log('');
console.log('⚠️ IMPORTANT: Update admin credentials in this script before running!');
console.log('');

// Uncomment the line below to run cleanup
// sessionCleanup();

module.exports = { sessionCleanup };