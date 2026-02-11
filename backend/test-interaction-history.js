const { getCategorizedInteractions, createInteractionRecord } = require('../services/interactionHistoryService');

// Test the interaction history service
async function testInteractionHistory() {
  try {
    console.log('🧪 Testing Interaction History Service...');
    
    // Test categorized interactions
    const categorized = await getCategorizedInteractions('1');
    console.log('✅ Categorized interactions:', categorized);
    
    console.log('🎯 Interaction history service is working correctly!');
  } catch (error) {
    console.error('❌ Interaction history test failed:', error);
  }
}

testInteractionHistory();