/**
 * Omnivox AI Audio File Management Service
 * Handles Twilio recording downloads and local audio file storage
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { prisma } from '../database/index';

const streamPipeline = promisify(pipeline);

interface AudioFileConfig {
  tempDirectory: string;
  maxFileSize: number;
  retentionDays: number;
  autoDeleteAfterProcessing: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
}

interface DownloadResult {
  localPath: string;
  originalUrl: string;
  fileSize: number;
  duration?: number;
  format: string;
}

export class AudioFileService {
  private config: AudioFileConfig;

  constructor(config?: Partial<AudioFileConfig>) {
    this.config = {
      tempDirectory: process.env.TEMP_DIRECTORY || '/tmp/omnivox-transcripts',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '26214400'), // 25MB
      retentionDays: parseInt(process.env.TRANSCRIPT_RETENTION_DAYS || '365'),
      autoDeleteAfterProcessing: process.env.AUTO_DELETE_AUDIO_FILES === 'true',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
      ...config
    };

    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Download Twilio recording to local storage
   */
  async downloadTwilioRecording(recordingUrl: string, callId: string): Promise<DownloadResult> {
    console.log(`📥 Starting Twilio recording download for call ${callId}`);
    console.log(`🔗 Recording URL: ${recordingUrl}`);

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${callId}_${timestamp}.wav`;
    const localPath = path.join(this.config.tempDirectory, fileName);

    try {
      // Convert Twilio recording URL to download URL
      const downloadUrl = this.getTwilioDownloadUrl(recordingUrl);
      console.log(`📥 Download URL: ${downloadUrl}`);

      // Download with Twilio authentication
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 60000, // 60 second timeout for large files
        auth: {
          username: this.config.twilioAccountSid,
          password: this.config.twilioAuthToken
        },
        headers: {
          'User-Agent': 'Omnivox-AI-Transcription/1.0'
        }
      });

      // Check file size
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        const fileSize = parseInt(contentLength);
        if (fileSize > this.config.maxFileSize) {
          throw new Error(`File too large: ${fileSize} bytes (max: ${this.config.maxFileSize})`);
        }
        console.log(`📊 File size: ${fileSize} bytes`);
      }

      // Stream download to local file
      await streamPipeline(response.data, createWriteStream(localPath));

      // Verify file was downloaded successfully
      if (!fs.existsSync(localPath)) {
        throw new Error('Failed to download audio file');
      }

      const stats = fs.statSync(localPath);
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      console.log(`✅ Audio file downloaded successfully: ${localPath} (${stats.size} bytes)`);

      // Extract audio metadata
      const format = this.getFileFormat(localPath);

      return {
        localPath,
        originalUrl: recordingUrl,
        fileSize: stats.size,
        format
      };

    } catch (error) {
      // Clean up partial download
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      console.error(`❌ Failed to download Twilio recording: ${error}`);
      throw new Error(`Recording download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download recording from any supported source
   */
  async downloadRecording(recordingUrl: string, callId: string): Promise<DownloadResult> {
    // Check if it's a Twilio recording URL
    if (this.isTwilioRecordingUrl(recordingUrl)) {
      return this.downloadTwilioRecording(recordingUrl, callId);
    }

    // Handle other URL types (direct HTTP, S3, etc.)
    return this.downloadGenericRecording(recordingUrl, callId);
  }

  /**
   * Download recording from generic HTTP URL
   */
  private async downloadGenericRecording(recordingUrl: string, callId: string): Promise<DownloadResult> {
    const timestamp = Date.now();
    const fileName = `${callId}_${timestamp}.wav`;
    const localPath = path.join(this.config.tempDirectory, fileName);

    try {
      const response = await axios({
        method: 'GET',
        url: recordingUrl,
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'Omnivox-AI-Transcription/1.0'
        }
      });

      // Check file size
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        const fileSize = parseInt(contentLength);
        if (fileSize > this.config.maxFileSize) {
          throw new Error(`File too large: ${fileSize} bytes (max: ${this.config.maxFileSize})`);
        }
      }

      await streamPipeline(response.data, createWriteStream(localPath));

      const stats = fs.statSync(localPath);
      const format = this.getFileFormat(localPath);

      return {
        localPath,
        originalUrl: recordingUrl,
        fileSize: stats.size,
        format
      };

    } catch (error) {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      throw error;
    }
  }

  /**
   * Clean up audio file after processing
   */
  async cleanupAudioFile(localPath: string): Promise<void> {
    if (this.config.autoDeleteAfterProcessing && fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        console.log(`🗑️ Cleaned up audio file: ${localPath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete audio file: ${localPath}`, error);
      }
    }
  }

  /**
   * Clean up old audio files based on retention policy
   */
  async cleanupOldFiles(): Promise<{ deletedCount: number; freedBytes: number }> {
    if (!fs.existsSync(this.config.tempDirectory)) {
      return { deletedCount: 0, freedBytes: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const files = fs.readdirSync(this.config.tempDirectory);
    let deletedCount = 0;
    let freedBytes = 0;

    for (const file of files) {
      const filePath = path.join(this.config.tempDirectory, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        try {
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to delete old file: ${filePath}`, error);
        }
      }
    }

    console.log(`🗑️ Cleanup complete: deleted ${deletedCount} files, freed ${freedBytes} bytes`);
    return { deletedCount, freedBytes };
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { totalFiles: number; totalSize: number; availableSpace?: number } {
    if (!fs.existsSync(this.config.tempDirectory)) {
      return { totalFiles: 0, totalSize: 0 };
    }

    const files = fs.readdirSync(this.config.tempDirectory);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(this.config.tempDirectory, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }

    return {
      totalFiles: files.length,
      totalSize,
    };
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.config.tempDirectory)) {
      fs.mkdirSync(this.config.tempDirectory, { recursive: true });
      console.log(`📁 Created temp directory: ${this.config.tempDirectory}`);
    }
  }

  /**
   * Check if URL is a Twilio recording URL
   */
  private isTwilioRecordingUrl(url: string): boolean {
    return url.includes('api.twilio.com') || url.includes('Recordings/');
  }

  /**
   * Convert Twilio recording identifier to download URL
   */
  private getTwilioDownloadUrl(recordingUrl: string): string {
    // If it's already a full URL, use it
    if (recordingUrl.startsWith('http')) {
      return recordingUrl;
    }

    // If it's a Twilio recording SID or path, construct the URL
    if (recordingUrl.startsWith('RE')) {
      return `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilioAccountSid}/Recordings/${recordingUrl}`;
    }

    // If it's a path like "/2010-04-01/Accounts/.../Recordings/..."
    if (recordingUrl.startsWith('/')) {
      return `https://api.twilio.com${recordingUrl}`;
    }

    return recordingUrl;
  }

  /**
   * Detect file format from file extension or content
   */
  private getFileFormat(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.wav':
        return 'wav';
      case '.mp3':
        return 'mp3';
      case '.m4a':
        return 'm4a';
      case '.flac':
        return 'flac';
      default:
        return 'unknown';
    }
  }

  /**
   * Create a new audio file record for uploaded prompts
   */
  static async createAudioFile(data: {
    name: string;
    filename: string;
    originalName: string;
    size: number;
    format: string;
    type: 'greeting' | 'hold_music' | 'announcement' | 'ivr_prompt' | 'voicemail' | 'other';
    description?: string;
    tags?: string[];
    duration: number;
    uploadedBy: string;
    fileData: Buffer;
  }) {
    const audioFile = await prisma.audioFile.create({
      data: {
        displayName: data.name,
        filename: data.filename,
        mimeType: `audio/${data.format}`,
        size: data.size,
        type: data.type,
        description: data.description || '',
        tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null,
        duration: data.duration,
        uploadedBy: data.uploadedBy,
        fileData: data.fileData
      }
    });

    return audioFile;
  }

  /**
   * Get all audio files
   */
  static async getAllAudioFiles() {
    const audioFiles = await prisma.audioFile.findMany({
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    return audioFiles;
  }

  /**
   * Get audio file by ID
   */
  static async getAudioFileById(id: string) {
    const audioFile = await prisma.audioFile.findUnique({
      where: { id }
    });

    return audioFile;
  }

  /**
   * Get audio files by type
   */
  static async getAudioFilesByType(type: string) {
    const audioFiles = await prisma.audioFile.findMany({
      where: { type },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    return audioFiles;
  }

  /**
   * Update audio file metadata
   */
  static async updateAudioFile(id: string, data: {
    name?: string;
    type?: 'greeting' | 'hold_music' | 'announcement' | 'ivr_prompt' | 'voicemail' | 'other';
    description?: string;
    tags?: string[];
  }) {
    const audioFile = await prisma.audioFile.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.tags && { tags: data.tags })
      }
    });

    return audioFile;
  }

  /**
   * Delete audio file
   */
  static async deleteAudioFile(id: string) {
    await prisma.audioFile.delete({
      where: { id }
    });
  }

  /**
   * Search audio files by name or tags
   */
  static async searchAudioFiles(query: string) {
    const audioFiles = await prisma.audioFile.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } }
        ]
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    return audioFiles;
  }
}

// Export singleton instance
export const audioFileService = new AudioFileService();