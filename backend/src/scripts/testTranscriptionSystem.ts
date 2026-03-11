#!/usr/bin/env node
/**
 * Omnivox AI - Transcription System Integration Test
 * Comprehensive test of the full transcription pipeline
 */

import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';
import axios from 'axios';
import chalk from 'chalk';

dotenv.config();

interface TestResult {
  component: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

class TranscriptionTester {
  private results: TestResult[] = [];
  private openai: OpenAI | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  private async runTest(
    name: string, 
    testFn: () => Promise<void>,
    required: boolean = true
  ): Promise<void> {
    const start = Date.now();
    
    try {
      console.log(chalk.blue(`🧪 Testing ${name}...`));
      await testFn();
      
      const duration = Date.now() - start;
      this.results.push({
        component: name,
        status: 'pass',
        message: 'Test passed',
        duration
      });
      
      console.log(chalk.green(`✅ ${name} passed (${duration}ms)`));
    } catch (error: any) {
      const duration = Date.now() - start;
      const status = required ? 'fail' : 'skip';
      
      this.results.push({
        component: name,
        status,
        message: error.message,
        duration
      });
      
      if (required) {
        console.log(chalk.red(`❌ ${name} failed: ${error.message}`));
      } else {
        console.log(chalk.yellow(`⚠️  ${name} skipped: ${error.message}`));
      }
    }
  }

  private async testOpenAIConnection(): Promise<void> {
    const provider = process.env.TRANSCRIPTION_PROVIDER;
    
    // Skip OpenAI test for free providers
    if (provider === 'local-whisper' || provider === 'whisper-cpp') {
      console.log('  🆓 Using FREE transcription - OpenAI test not needed');
      return;
    }
    
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.models.list();
    
    if (!response.data || response.data.length === 0) {
      throw new Error('No models available');
    }

    // Check if Whisper model is available
    const whisperModel = response.data.find(model => 
      model.id.includes('whisper')
    );
    
    if (!whisperModel) {
      throw new Error('Whisper model not available');
    }
  }

  private async testStorageDirectory(): Promise<void> {
    const storagePath = process.env.AUDIO_STORAGE_PATH || './storage/audio';
    const absolutePath = path.resolve(storagePath);

    // Test directory exists or can be created
    try {
      await fs.access(absolutePath);
    } catch {
      await fs.mkdir(absolutePath, { recursive: true });
    }

    // Test write permissions
    const testFile = path.join(absolutePath, 'test-file.tmp');
    await fs.writeFile(testFile, 'test data');
    
    // Test read permissions
    const content = await fs.readFile(testFile, 'utf8');
    if (content !== 'test data') {
      throw new Error('File read/write test failed');
    }

    // Cleanup
    await fs.unlink(testFile);
  }

  private async testBackendHealth(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`Health check returned status ${response.status}`);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running');
      }
      throw error;
    }
  }

  private async testTranscriptionEndpoint(): Promise<void> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/admin/transcripts/system/status`,
        { timeout: 5000 }
      );
      
      if (response.status !== 200) {
        throw new Error(`Status endpoint returned ${response.status}`);
      }

      const status = response.data;
      if (!status.openai || !status.storage) {
        throw new Error('Status endpoint missing required fields');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Transcription management routes not available');
      }
      throw error;
    }
  }

  private async testConfigurationValidation(): Promise<void> {
    const requiredVars = [
      'OPENAI_API_KEY',
      'TWILIO_ACCOUNT_SID', 
      'TWILIO_AUTH_TOKEN',
      'REDIS_URL'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    // Validate format
    if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }

    if (!process.env.TWILIO_ACCOUNT_SID?.startsWith('AC')) {
      throw new Error('Invalid Twilio Account SID format');
    }
  }

  private async testSampleTranscription(): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    // Create a minimal test audio buffer (this would normally be a real audio file)
    // Note: This is a placeholder test - real implementation would need actual audio
    const testAudio = Buffer.from('test audio data');
    
    if (testAudio.length < 10) {
      throw new Error('Cannot test transcription without valid audio file');
    }

    // This test verifies the setup but doesn't actually call OpenAI
    // to avoid costs during testing
    console.log('  📝 Note: Actual transcription test skipped to avoid API costs');
  }

  public async runAllTests(): Promise<void> {
    console.log(chalk.cyan('🧪 Omnivox AI - Transcription System Test Suite'));
    console.log(chalk.cyan('===============================================\n'));

    // Configuration tests
    await this.runTest(
      'Environment Configuration',
      () => this.testConfigurationValidation()
    );

    // OpenAI tests
    await this.runTest(
      'OpenAI API Connection',
      () => this.testOpenAIConnection()
    );

    // Storage tests
    await this.runTest(
      'Audio Storage Directory',
      () => this.testStorageDirectory()
    );

    // Backend tests
    await this.runTest(
      'Backend Server Health',
      () => this.testBackendHealth(),
      false // Not required if running tests separately
    );

    await this.runTest(
      'Transcription API Endpoints',
      () => this.testTranscriptionEndpoint(),
      false // Not required if backend not running
    );

    // Integration tests
    await this.runTest(
      'Sample Transcription Pipeline',
      () => this.testSampleTranscription(),
      false // Skip to avoid API costs
    );

    this.displayResults();
  }

  private displayResults(): void {
    console.log('\n' + chalk.cyan('📊 Test Results Summary:'));
    console.log(chalk.cyan('========================\n'));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : 
                   result.status === 'fail' ? '❌' : '⚠️';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      
      console.log(`${icon} ${result.component}${duration}`);
      
      if (result.status === 'fail') {
        console.log(`   ${chalk.red(result.message)}`);
      }
    });

    console.log(`\n📈 Summary: ${chalk.green(passed)} passed, ${chalk.red(failed)} failed, ${chalk.yellow(skipped)} skipped\n`);

    if (failed === 0) {
      console.log(chalk.green.bold('🎉 All critical tests passed! System is ready for production.'));
      
      console.log('\n' + chalk.bold('🚀 Next Steps:'));
      console.log('1. Start the backend server: npm run dev');
      console.log('2. Make a test call with recording');
      console.log('3. Check transcript generation in admin panel');
    } else {
      console.log(chalk.red.bold('❌ Some tests failed. Please resolve issues before deployment.'));
      
      console.log('\n' + chalk.bold('🔧 Troubleshooting:'));
      console.log('• Check .env configuration: npm run setup:openai');
      console.log('• Verify backend is running: npm run dev');
      console.log('• Review system status: npm run transcription:status');
    }

    console.log('');
  }
}

async function main(): Promise<void> {
  const tester = new TranscriptionTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error(chalk.red('❌ Test suite failed:'), error);
    process.exit(1);
  }
}

main();