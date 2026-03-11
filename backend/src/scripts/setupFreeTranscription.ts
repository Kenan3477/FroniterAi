#!/usr/bin/env node
/**
 * Omnivox AI - FREE Transcription Setup Script
 * Interactive script to configure free transcription alternatives
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function checkPythonInstallation(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('python', ['--version'], { stdio: 'pipe' });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function checkWhisperInstallation(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('whisper', ['--help'], { stdio: 'pipe' });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function installLocalWhisper(): Promise<boolean> {
  console.log('📦 Installing OpenAI Whisper (free open-source version)...');
  
  return new Promise((resolve) => {
    const child = spawn('pip', ['install', 'openai-whisper'], { 
      stdio: 'inherit' 
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Local Whisper installed successfully!');
        resolve(true);
      } else {
        console.log('❌ Failed to install Local Whisper');
        resolve(false);
      }
    });
  });
}

async function testLocalWhisper(): Promise<boolean> {
  console.log('🧪 Testing Local Whisper installation...');
  
  return new Promise((resolve) => {
    const child = spawn('whisper', ['--help'], { stdio: 'pipe' });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Local Whisper test passed!');
        resolve(true);
      } else {
        console.log('❌ Local Whisper test failed');
        resolve(false);
      }
    });
  });
}

async function updateEnvFile(provider: string): Promise<void> {
  const envPath = path.join(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update transcription provider
  if (envContent.includes('TRANSCRIPTION_PROVIDER=')) {
    envContent = envContent.replace(/TRANSCRIPTION_PROVIDER=.*$/m, `TRANSCRIPTION_PROVIDER=${provider}`);
  } else {
    envContent += `\nTRANSCRIPTION_PROVIDER=${provider}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ .env updated to use ${provider}`);
}

async function main(): Promise<void> {
  console.log('🎉 Omnivox AI - FREE Transcription Setup');
  console.log('=========================================\n');

  console.log('🆓 Choose your FREE transcription option:');
  console.log('1. Local Whisper - Same accuracy as OpenAI API (recommended)');
  console.log('2. Whisper.cpp - Ultra-fast C++ implementation');
  console.log('3. Keep OpenAI API (paid option)\n');

  const choice = await question('Select option (1-3): ');

  switch (choice) {
    case '1':
      console.log('\n🔧 Setting up Local Whisper (FREE)...\n');
      
      // Check Python
      const hasPython = await checkPythonInstallation();
      if (!hasPython) {
        console.log('❌ Python not found. Please install Python 3.7+ first.');
        console.log('Visit: https://python.org/downloads/');
        rl.close();
        return;
      }
      console.log('✅ Python found');

      // Check if Whisper is already installed
      const hasWhisper = await checkWhisperInstallation();
      
      if (!hasWhisper) {
        const install = await question('Install OpenAI Whisper? (y/n): ');
        if (install.toLowerCase() === 'y') {
          const success = await installLocalWhisper();
          if (!success) {
            console.log('\n❌ Installation failed. Try manually:');
            console.log('pip install openai-whisper');
            rl.close();
            return;
          }
        }
      } else {
        console.log('✅ Local Whisper already installed');
      }

      // Test installation
      const testPassed = await testLocalWhisper();
      if (!testPassed) {
        console.log('❌ Local Whisper test failed');
        rl.close();
        return;
      }

      // Update .env
      await updateEnvFile('local-whisper');

      console.log('\n🎉 Local Whisper setup complete!');
      console.log('\n📊 Benefits:');
      console.log('• 💰 Cost: $0.00 (completely FREE!)');
      console.log('• 🔒 Privacy: Audio never leaves your server');
      console.log('• 📈 Accuracy: Same as OpenAI Whisper API');
      console.log('• 🚫 Limits: No rate limits or quotas');
      
      break;

    case '2':
      console.log('\n⚡ Whisper.cpp Setup Guide');
      console.log('===========================\n');
      
      console.log('🔧 Installation steps:');
      console.log('1. git clone https://github.com/ggerganov/whisper.cpp.git');
      console.log('2. cd whisper.cpp && make -j');
      console.log('3. bash ./models/download-ggml-model.sh base.en');
      console.log('4. Add whisper.cpp to your PATH\n');

      console.log('📊 Benefits:');
      console.log('• 💰 Cost: $0.00 (completely FREE!)');
      console.log('• ⚡ Speed: 10-20x faster than Python Whisper');
      console.log('• 💾 Memory: Lower RAM usage');
      console.log('• 🔒 Privacy: Audio never leaves your server');
      console.log('• 📈 Accuracy: Same as OpenAI Whisper\n');

      const setupCpp = await question('Have you completed the installation? (y/n): ');
      if (setupCpp.toLowerCase() === 'y') {
        await updateEnvFile('whisper-cpp');
        console.log('\n✅ Whisper.cpp configured!');
      } else {
        console.log('\n📝 Complete the installation steps above, then run this script again.');
      }
      
      break;

    case '3':
      console.log('\n💳 Keeping OpenAI API (paid option)');
      await updateEnvFile('openai');
      console.log('\n💰 Remember: OpenAI charges $0.006 per minute');
      console.log('• 10-minute call: ~$0.06');
      console.log('• 1000 calls/month (10 min avg): ~$60');
      
      break;

    default:
      console.log('❌ Invalid option selected');
  }

  console.log('\n🚀 Next steps:');
  console.log('1. Restart your Omnivox backend server');
  console.log('2. Make a test call to verify transcription');
  console.log('3. Check system status: npm run transcription:status\n');

  console.log('💡 You can switch providers anytime by running this script again!');

  rl.close();
}

main().catch(error => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});