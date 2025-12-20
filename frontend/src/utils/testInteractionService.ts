/**
 * Test the interaction service to ensure it handles empty data correctly
 */

import { getOutcomedInteractions, getActiveInteractions } from '@/services/interactionService';

async function testInteractionService() {
  console.log('🧪 Testing Interaction Service...');
  
  try {
    // Test outcomed interactions
    console.log('📞 Testing outcomed interactions...');
    const outcomedInteractions = await getOutcomedInteractions('demo-agent');
    console.log('✅ Outcomed interactions result:', outcomedInteractions);
    console.log('📊 Count:', outcomedInteractions.length);
    
    // Test active interactions  
    console.log('📞 Testing active interactions...');
    const activeInteractions = await getActiveInteractions('demo-agent');
    console.log('✅ Active interactions result:', activeInteractions);
    console.log('📊 Count:', activeInteractions.length);
    
    // Verify both return empty arrays when no real calls exist
    if (outcomedInteractions.length === 0 && activeInteractions.length === 0) {
      console.log('✅ SUCCESS: Both services correctly return empty arrays - no mock data!');
    } else {
      console.log('⚠️  WARNING: Services returned data - verify this is real call data, not mock data');
    }
    
  } catch (error) {
    console.error('❌ Error testing interaction service:', error);
  }
}

// Export for testing
export default testInteractionService;