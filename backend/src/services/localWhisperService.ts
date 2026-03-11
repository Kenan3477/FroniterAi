/**
 * Local Whisper Service - FREE Transcription
 * Uses OpenAI's free open-source Whisper model locally
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

interface LocalWhisperConfig {
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
  enableTimestamps: boolean;
  outputFormat: 'txt' | 'json' | 'srt' | 'vtt';
  tempDirectory: string;
  device: 'cpu' | 'cuda';
}

interface WhisperResult {
  text: string;
  segments?: WhisperSegment[];
  language?: string;
  confidence?: number;
  duration?: number;
  wordCount?: number;
  processingTimeMs?: number;
}

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export class LocalWhisperService {
  private config: LocalWhisperConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<LocalWhisperConfig> = {}) {
    this.config = {
      modelSize: 'base', // Good balance of speed and accuracy
      language: 'en',
      enableTimestamps: true,
      outputFormat: 'json',
      tempDirectory: process.env.TEMP_DIRECTORY || '/tmp/whisper',
      device: 'cpu', // CPU is fine for most use cases
      ...config
    };

    this.ensureDirectoryExists();
  }

  /**
   * Initialize Local Whisper (downloads model if needed)
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Local Whisper (FREE)...');
    
    try {
      // Check if whisper is installed
      await this.checkWhisperInstallation();
      
      // Download model if not present
      await this.ensureModelDownloaded();
      
      this.isInitialized = true;
      console.log(`✅ Local Whisper initialized with ${this.config.modelSize} model`);
      console.log('💰 Cost: $0.00 (completely FREE!)');
      
    } catch (error) {
      console.error('❌ Failed to initialize Local Whisper:', error);
      throw new Error('Whisper initialization failed. Run: pip install openai-whisper');
    }
  }

  /**
   * Transcribe audio file using local Whisper
   */
  async transcribe(audioFilePath: string): Promise<WhisperResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const tempOutputPath = path.join(
      this.config.tempDirectory, 
      `whisper_output_${Date.now()}`
    );

    try {
      console.log('🎯 Transcribing with FREE local Whisper...');

      // Build whisper command
      const args = [
        audioFilePath,
        '--model', this.config.modelSize,
        '--output_dir', this.config.tempDirectory,
        '--output_format', this.config.outputFormat,
        '--verbose', 'False'
      ];

      if (this.config.language) {
        args.push('--language', this.config.language);
      }

      if (this.config.device === 'cuda') {
        args.push('--device', 'cuda');
      }

      // Run whisper command
      await this.runWhisperCommand(args);

      // Parse results
      const result = await this.parseWhisperOutput(audioFilePath, tempOutputPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ FREE transcription completed in ${processingTime}ms`);

      return {
        ...result,
        processingTimeMs: processingTime
      };

    } catch (error) {
      console.error('❌ Local Whisper transcription failed:', error);
      throw error;
    } finally {
      // Cleanup temp files
      await this.cleanupTempFiles(tempOutputPath);
    }
  }

  /**
   * Check if Whisper is installed
   */
  private async checkWhisperInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use the Python environment path
      const whisperPath = '/Users/zenan/kennex/.venv/bin/whisper';
      const child = spawn(whisperPath, ['--help'], { stdio: 'pipe' });
      
      child.on('error', () => {
        reject(new Error('Whisper not installed. Install with: pip install openai-whisper'));
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Whisper installation check failed'));
        }
      });
    });
  }

  /**
   * Ensure Whisper model is downloaded
   */
  private async ensureModelDownloaded(): Promise<void> {
    console.log(`🔄 Checking for ${this.config.modelSize} model...`);
    
    // Whisper automatically downloads models on first use
    // We can test with a tiny silent audio file
    const testAudioPath = await this.createSilentTestAudio();
    
    try {
      const whisperPath = '/Users/zenan/kennex/.venv/bin/whisper';
      await this.runWhisperCommand([
        testAudioPath,
        '--model', this.config.modelSize,
        '--output_dir', this.config.tempDirectory,
        '--output_format', 'txt'
      ]);
      
      console.log(`✅ ${this.config.modelSize} model ready`);
    } finally {
      // Clean up test file
      if (fs.existsSync(testAudioPath)) {
        await unlink(testAudioPath);
      }
    }
  }

  /**
   * Run whisper command
   */
  private async runWhisperCommand(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use the Python environment path
      const whisperPath = '/Users/zenan/kennex/.venv/bin/whisper';
      const child = spawn(whisperPath, args, { 
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
        reject(new Error(`Whisper process error: ${error.message}`));
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Whisper failed (code ${code}): ${stderr}`));
        }
      });
    });
  }

  /**
   * Parse Whisper output files
   */
  private async parseWhisperOutput(originalPath: string, outputDir: string): Promise<WhisperResult> {
    const baseName = path.basename(originalPath, path.extname(originalPath));
    
    if (this.config.outputFormat === 'json') {
      const jsonPath = path.join(outputDir, `${baseName}.json`);
      
      if (fs.existsSync(jsonPath)) {
        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        const whisperData = JSON.parse(jsonContent);
        
        return {
          text: whisperData.text,
          segments: whisperData.segments?.map((seg: any, index: number) => ({
            id: index,
            start: seg.start,
            end: seg.end,
            text: seg.text,
            confidence: 0.9 // Whisper doesn't provide confidence scores
          })),
          language: whisperData.language,
          duration: whisperData.segments?.[whisperData.segments.length - 1]?.end,
          wordCount: whisperData.text.split(/\s+/).length,
          confidence: 0.9
        };
      }
    }

    // Fallback to text output
    const txtPath = path.join(outputDir, `${baseName}.txt`);
    if (fs.existsSync(txtPath)) {
      const text = fs.readFileSync(txtPath, 'utf8');
      return {
        text,
        wordCount: text.split(/\s+/).length,
        confidence: 0.9
      };
    }

    throw new Error('No output file found');
  }

  /**
   * Create silent test audio for model verification
   */
  private async createSilentTestAudio(): Promise<string> {
    const testPath = path.join(this.config.tempDirectory, 'test_silent.wav');
    
    // Create 1-second silent WAV file (44 bytes header + 44100 samples)
    const sampleRate = 44100;
    const duration = 1; // 1 second
    const samples = sampleRate * duration;
    
    const buffer = Buffer.alloc(44 + samples * 2);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM format
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples * 2, 40);
    
    // Silent samples (all zeros)
    buffer.fill(0, 44);
    
    await writeFile(testPath, buffer);
    return testPath;
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
   * Clean up temporary files
   */
  private async cleanupTempFiles(outputPath: string): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.tempDirectory);
      for (const file of files) {
        if (file.startsWith('whisper_output_') || file.startsWith('test_')) {
          const filePath = path.join(this.config.tempDirectory, file);
          if (fs.existsSync(filePath)) {
            await unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup temp files:', error);
    }
  }

  /**
   * Get system requirements and installation info
   */
  static getInstallationInfo(): {
    requirements: string[];
    installation: string[];
    modelSizes: Array<{name: string; size: string; speed: string; accuracy: string}>;
  } {
    return {
      requirements: [
        'Python 3.7+',
        'pip package manager',
        '1-4 GB storage (for models)',
        '1 GB RAM minimum'
      ],
      installation: [
        'pip install openai-whisper',
        'pip install torch', // For faster processing
        'Optional: Install ffmpeg for better audio support'
      ],
      modelSizes: [
        { name: 'tiny', size: '39 MB', speed: 'Very Fast', accuracy: 'Good' },
        { name: 'base', size: '74 MB', speed: 'Fast', accuracy: 'Better' },
        { name: 'small', size: '244 MB', speed: 'Medium', accuracy: 'Good' },
        { name: 'medium', size: '769 MB', speed: 'Slow', accuracy: 'Very Good' },
        { name: 'large', size: '1550 MB', speed: 'Very Slow', accuracy: 'Best' }
      ]
    };
  }
}

// Export singleton instance
export const localWhisperService = new LocalWhisperService();