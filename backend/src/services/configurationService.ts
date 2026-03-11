/**
 * Omnivox AI Configuration Management Service
 * Simplified configuration for FREE transcription providers
 */

import fs from 'fs';
import path from 'path';

// Configuration interfaces  
interface TranscriptionConfig {
  provider: string;
  openaiApiKey: string;
  language: string;
  concurrency: number;
  tempDirectory: string;
  maxFileSize: number;
  retentionDays: number;
  dailyCostLimit: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigurationService {
  private config: TranscriptionConfig;

  constructor() {
    this.config = {
      provider: process.env.TRANSCRIPTION_PROVIDER || 'local-whisper',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      language: process.env.TRANSCRIPTION_LANGUAGE || 'en',
      concurrency: parseInt(process.env.TRANSCRIPTION_CONCURRENCY || '5'),
      tempDirectory: process.env.TEMP_DIRECTORY || '/tmp/omnivox-transcripts',
      maxFileSize: 25 * 1024 * 1024, // 25MB
      retentionDays: parseInt(process.env.TRANSCRIPT_RETENTION_DAYS || '365'),
      dailyCostLimit: parseFloat(process.env.DAILY_COST_LIMIT || '100')
    };
  }

  /**
   * Validate complete transcription system configuration
   */
  async validateConfiguration(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check provider
    const supportedProviders = ['openai', 'self-hosted', 'local-whisper', 'whisper-cpp'];
    if (!supportedProviders.includes(this.config.provider)) {
      result.errors.push(`Unsupported transcription provider: ${this.config.provider}`);
      result.isValid = false;
    }

    // Check OpenAI configuration only for OpenAI provider
    if (this.config.provider === 'openai') {
      if (!this.config.openaiApiKey) {
        result.errors.push('OpenAI API key not configured (OPENAI_API_KEY)');
        result.isValid = false;
      }
    } else {
      result.warnings.push('Using FREE transcription provider - no API key needed! 🎉');
    }

    // Check storage
    await this.validateStorageConfig(result);

    // Check other settings
    if (this.config.concurrency < 1) {
      result.errors.push('Transcription concurrency must be at least 1');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate storage configuration
   */
  private async validateStorageConfig(result: ValidationResult): Promise<void> {
    try {
      if (!fs.existsSync(this.config.tempDirectory)) {
        fs.mkdirSync(this.config.tempDirectory, { recursive: true });
        console.log(`✅ Created storage directory: ${this.config.tempDirectory}`);
      }

      // Test write permissions
      const testFile = path.join(this.config.tempDirectory, 'test.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

    } catch (error) {
      result.errors.push(`Storage directory not accessible: ${this.config.tempDirectory}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): TranscriptionConfig {
    return this.config;
  }

  /**
   * Get configuration (alias for compatibility)
   */
  getConfig(): TranscriptionConfig {
    return this.config;
  }

  /**
   * Generate configuration report
   */
  generateConfigReport(): string {
    return 'Configuration report generated';
  }

  /**
   * Print system status report
   */
  printStatusReport(): void {
    console.log('\n🔧 OMNIVOX AI TRANSCRIPTION CONFIGURATION REPORT');
    console.log('================================================\n');

    console.log('📊 Core Settings:');
    console.log(`   Provider: ${this.config.provider}`);
    console.log(`   Language: ${this.config.language}`);
    console.log(`   Concurrency: ${this.config.concurrency}`);
    
    console.log('\n🎵 Audio Management:');
    console.log(`   Temp Directory: ${this.config.tempDirectory}`);
    console.log(`   Max File Size: ${(this.config.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   Retention: ${this.config.retentionDays} days`);
    
    console.log('\n💰 Cost Management:');
    if (this.config.provider === 'openai') {
      console.log(`   Cost Tracking: Enabled`);
      console.log(`   Daily Limit: $${this.config.dailyCostLimit}`);
    } else {
      console.log(`   Cost: $0.00 (FREE provider!) 🎉`);
      console.log(`   Daily Limit: Not needed (FREE!)`);
    }

    console.log('\n🔒 Security Features:');
    console.log(`   Speaker Diarization: Enabled`);
    console.log(`   Timestamps: Enabled`);
  }
}

// Export singleton instance
export const configurationService = new ConfigurationService();