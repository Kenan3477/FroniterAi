#!/usr/bin/env node
/**
 * Omnivox AI - OpenAI API Key Setup Script
 * Interactive script to configure OpenAI integration
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import OpenAI from 'openai';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey });
    await openai.models.list();
    return true;
  } catch (error: any) {
    if (error.status === 401) {
      console.log('❌ Invalid API key');
    } else if (error.status === 429) {
      console.log('✅ API key is valid (rate limited)');
      return true;
    } else {
      console.log('❌ API key test failed:', error.message);
    }
    return false;
  }
}

async function updateEnvFile(apiKey: string): Promise<void> {
  const envPath = path.join(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add OpenAI API key
  if (envContent.includes('OPENAI_API_KEY=')) {
    envContent = envContent.replace(/OPENAI_API_KEY=.*$/m, `OPENAI_API_KEY=${apiKey}`);
  } else {
    envContent += `\nOPENAI_API_KEY=${apiKey}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file updated');
}

async function main(): Promise<void> {
  console.log('🔧 Omnivox AI - OpenAI API Key Setup');
  console.log('=====================================\n');

  console.log('This script will help you configure OpenAI integration for:');
  console.log('• 🎯 Call transcription with Whisper API');
  console.log('• 🤖 AI-powered call analysis with GPT-4');
  console.log('• 📊 Automated sentiment analysis');
  console.log('• ✅ Compliance monitoring\n');

  const hasKey = await question('Do you have an OpenAI API key? (y/n): ');

  if (hasKey.toLowerCase() !== 'y') {
    console.log('\n📝 To get an OpenAI API key:');
    console.log('1. Visit: https://platform.openai.com/api-keys');
    console.log('2. Sign in or create an account');
    console.log('3. Click "Create new secret key"');
    console.log('4. Copy the key (it starts with "sk-")');
    console.log('5. Run this script again\n');
    
    rl.close();
    return;
  }

  const apiKey = await question('\nEnter your OpenAI API key: ');

  if (!apiKey.startsWith('sk-')) {
    console.log('❌ Invalid API key format. Keys should start with "sk-"');
    rl.close();
    return;
  }

  console.log('\n🔍 Validating API key...');
  
  const isValid = await validateApiKey(apiKey);
  
  if (!isValid) {
    console.log('\n❌ API key validation failed. Please check your key and try again.');
    rl.close();
    return;
  }

  console.log('✅ API key is valid!\n');

  // Update .env file
  await updateEnvFile(apiKey);

  console.log('🎉 OpenAI integration configured successfully!');
  console.log('\nNext steps:');
  console.log('1. Restart the Omnivox backend server');
  console.log('2. Check transcription status at /api/admin/transcripts/system/status');
  console.log('3. New call recordings will be automatically transcribed\n');

  console.log('💡 Cost estimates (OpenAI Whisper API):');
  console.log('• 1-hour call: ~$0.36');
  console.log('• 10-minute call: ~$0.06');
  console.log('• 1000 calls/month (10 min avg): ~$60\n');

  console.log('⚙️ You can adjust settings in .env:');
  console.log('• TRANSCRIPTION_CONCURRENCY: Number of simultaneous transcriptions');
  console.log('• DAILY_COST_LIMIT: Daily spending limit in USD');
  console.log('• AUTO_DELETE_AUDIO_FILES: Auto-cleanup for privacy');

  rl.close();
}

main().catch(error => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});