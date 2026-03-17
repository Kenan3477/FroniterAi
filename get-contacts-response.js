#!/usr/bin/env node

/**
 * Get the full contacts API response to understand the structure
 */

const API_BASE = 'https://froniterai-production.up.railway.app';

async function getFullContactsResponse() {
  try {
    console.log('📋 Getting full contacts response...\n');

    const response = await fetch(`${API_BASE}/api/contacts`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Full response:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

getFullContactsResponse();