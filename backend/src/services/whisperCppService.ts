/**
 * Whisper.cpp Service - Ultra-Fast FREE Transcription
 * C++ implementation of Whisper for maximum speed and efficiency
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

interface WhisperCppConfig {
  modelPath: string;
  language?: string;
  threads: number;
  enableTimestamps: boolean;
  outputFormat: 'txt' | 'json' | 'srt' | 'vtt';
  tempDirectory: string;
}

interface WhisperCppResult {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  processingTimeMs: number;
}

export class WhisperCppService {
  private config: WhisperCppConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<WhisperCppConfig> = {}) {
    this.config = {
      modelPath: process.env.WHISPER_CPP_MODEL_PATH || './models/ggml-base.en.bin',
      language: 'en',
      threads: parseInt(process.env.WHISPER_CPP_THREADS || '4'),
      enableTimestamps: true,
      outputFormat: 'json',
      tempDirectory: process.env.TEMP_DIRECTORY || '/tmp/whisper-cpp',
      ...config
    };

    this.ensureDirectoryExists();
  }

  /**
   * Initialize Whisper.cpp (check installation and model)
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Whisper.cpp (FREE & FAST)...');
    
    try {
      await this.checkWhisperCppInstallation();
      await this.ensureModelExists();
      
      this.isInitialized = true;
      console.log('✅ Whisper.cpp initialized');
      console.log('🚀 Speed: 10x faster than Python Whisper');
      console.log('💰 Cost: $0.00 (completely FREE!)');
      
    } catch (error) {
      console.error('❌ Failed to initialize Whisper.cpp:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio using Whisper.cpp
   */
  async transcribe(audioFilePath: string): Promise<WhisperCppResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const outputPath = path.join(
      this.config.tempDirectory,
      `output_${Date.now()}.json`
    );

    try {
      console.log('⚡ Transcribing with ultra-fast Whisper.cpp...');

      const args = [
        '-m', this.config.modelPath,
        '-f', audioFilePath,
        '-t', this.config.threads.toString(),
        '-oj' // Output JSON format
      ];

      if (this.config.language) {
        args.push('-l', this.config.language);
      }

      await this.runWhisperCpp(args, outputPath);

      const result = await this.parseOutput(outputPath);
      const processingTime = Date.now() - startTime;

      console.log(`⚡ Ultra-fast transcription completed in ${processingTime}ms`);

      return {
        ...result,
        processingTimeMs: processingTime
      };

    } catch (error) {
      console.error('❌ Whisper.cpp transcription failed:', error);
      throw error;
    } finally {
      // Cleanup
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
  }

  /**
   * Check if Whisper.cpp is installed
   */
  private async checkWhisperCppInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('whisper-cpp', ['--help'], { stdio: 'pipe' });
      
      child.on('error', () => {
        reject(new Error(`
Whisper.cpp not found. Install with:
1. git clone https://github.com/ggerganov/whisper.cpp.git
2. cd whisper.cpp && make
3. Add whisper.cpp to your PATH

Or use the setup script: npm run setup:whisper-cpp
        `));
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Whisper.cpp installation check failed'));
        }
      });
    });
  }

  /**
   * Ensure model file exists
   */
  private async ensureModelExists(): Promise<void> {
    if (!fs.existsSync(this.config.modelPath)) {
      throw new Error(`
Model not found: ${this.config.modelPath}

Download models with:
bash ./models/download-ggml-model.sh base.en

Available models:
- tiny.en (39 MB) - Fastest
- base.en (74 MB) - Recommended
- small.en (244 MB) - Better accuracy
- medium.en (769 MB) - High accuracy
- large (1550 MB) - Best accuracy
      `);
    }

    console.log(`✅ Model found: ${this.config.modelPath}`);
  }

  /**
   * Run Whisper.cpp process
   */
  private async runWhisperCpp(args: string[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('whisper-cpp', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(new Error(`Whisper.cpp error: ${error.message}`));
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Whisper.cpp failed (code ${code}): ${stderr}`));
        }
      });
    });
  }

  /**
   * Parse Whisper.cpp JSON output
   */
  private async parseOutput(outputPath: string): Promise<WhisperCppResult> {
    if (!fs.existsSync(outputPath)) {
      throw new Error('No output file generated');
    }

    const jsonContent = fs.readFileSync(outputPath, 'utf8');
    const data = JSON.parse(jsonContent);

    return {
      text: data.transcription || '',
      segments: data.segments?.map((seg: any) => ({
        start: seg.offsets.from / 1000, // Convert to seconds
        end: seg.offsets.to / 1000,
        text: seg.text
      })),
      processingTimeMs: 0 // Will be set by caller
    };
  }

  /**
   * Ensure temp directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.config.tempDirectory)) {
      fs.mkdirSync(this.config.tempDirectory, { recursive: true });
    }
  }

  /**
   * Get installation and setup info
   */
  static getSetupInfo(): {
    advantages: string[];
    requirements: string[];
    installation: string[];
    models: string[];
  } {
    return {
      advantages: [
        '10-20x faster than Python Whisper',
        'Lower memory usage (CPU optimized)',
        'No Python dependencies',
        'Smaller binary size',
        'Same accuracy as OpenAI Whisper'
      ],
      requirements: [
        'C++ compiler (gcc/clang)',
        'Make build system',
        '1-4 GB storage for models',
        '512 MB RAM minimum'
      ],
      installation: [
        'git clone https://github.com/ggerganov/whisper.cpp.git',
        'cd whisper.cpp',
        'make -j', // Use all CPU cores for compilation
        'bash ./models/download-ggml-model.sh base.en',
        'Add whisper.cpp binary to PATH'
      ],
      models: [
        'tiny.en - 39 MB (ultra-fast, good for real-time)',
        'base.en - 74 MB (recommended for production)',
        'small.en - 244 MB (better accuracy)',
        'medium.en - 769 MB (high accuracy)',
        'large - 1550 MB (best accuracy, all languages)'
      ]
    };
  }
}

export const whisperCppService = new WhisperCppService();