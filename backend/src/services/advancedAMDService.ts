/**
 * Advanced Answering Machine Detection (AMD) Service
 * Fine-tuned algorithms for accurate machine vs human detection
 */

import { EventEmitter } from 'events';

interface AMDAnalysis {
  isAnsweringMachine: boolean;
  confidence: number;
  detectionMethod: 'silence_pattern' | 'voice_pattern' | 'duration_pattern' | 'keyword_pattern' | 'energy_pattern';
  indicators: {
    silenceGaps: number;
    averageEnergy: number;
    voiceDuration: number;
    speechRate: number;
    pausePatterns: number[];
    keywords: string[];
    tonalVariation: number;
  };
  reasoning: string;
  timeToDetection: number;
}

interface AudioMetrics {
  timestamp: number;
  energy: number;
  isSpeech: boolean;
  duration: number;
  frequency: number;
  amplitude: number;
}

export class AdvancedAMDService extends EventEmitter {
  private audioMetrics = new Map<string, AudioMetrics[]>();
  private analysisResults = new Map<string, AMDAnalysis>();
  private detectionThresholds = {
    // Silence-based detection
    longSilenceThreshold: 1500, // ms
    shortSilenceThreshold: 200, // ms
    silenceRatio: 0.3, // 30% silence indicates machine
    
    // Energy-based detection
    lowEnergyThreshold: 0.1,
    energyVariationThreshold: 0.05,
    
    // Duration-based detection
    shortResponseThreshold: 2000, // < 2s likely human
    longMonologueThreshold: 15000, // > 15s likely machine
    
    // Speech pattern detection
    monotoneThreshold: 0.2,
    speechRateVariation: 0.15,
    
    // Confidence thresholds
    minimumConfidence: 0.7,
    highConfidence: 0.9
  };

  private machineKeywords = [
    // English greetings
    'you have reached', 'thanks for calling', 'leave a message',
    'not available', 'please leave', 'after the tone', 'after the beep',
    'return your call', 'voicemail', 'voice mail', 'mailbox',
    
    // Spanish greetings
    'ha llamado', 'deje un mensaje', 'no está disponible',
    'después del tono', 'buzón de voz',
    
    // French greetings  
    'vous avez joint', 'laissez un message', 'n\'est pas disponible',
    'après le bip',
    
    // Generic patterns
    'press', 'option', 'dial', 'extension', 'directory',
    'business hours', 'office hours', 'closed', 'holiday'
  ];

  private humanIndicators = [
    'hello', 'hi', 'hey', 'yes', 'yeah', 'what', 'who is this',
    'sorry', 'hold on', 'wait', 'one moment', 'speaking',
    'this is', 'can you', 'what do you', 'who\'s calling'
  ];

  constructor() {
    super();
    console.log('🤖 Advanced AMD Service initialized');
  }

  /**
   * Analyze audio chunk for AMD indicators
   */
  public analyzeAudioChunk(
    callId: string,
    audioBuffer: Buffer,
    timestamp: number
  ): AMDAnalysis | null {
    try {
      // Extract audio metrics
      const metrics = this.extractAudioMetrics(audioBuffer, timestamp);
      
      // Store metrics
      if (!this.audioMetrics.has(callId)) {
        this.audioMetrics.set(callId, []);
      }
      this.audioMetrics.get(callId)!.push(metrics);

      // Get all metrics for this call
      const allMetrics = this.audioMetrics.get(callId)!;
      const callDuration = timestamp - allMetrics[0].timestamp;

      // Only start analysis after minimum audio duration
      if (callDuration < 1000) { // Wait at least 1 second
        return null;
      }

      // Perform comprehensive AMD analysis
      const analysis = this.performAMDAnalysis(callId, allMetrics, callDuration);
      
      if (analysis.confidence > this.detectionThresholds.minimumConfidence) {
        this.analysisResults.set(callId, analysis);
        this.emit('amd_detection', { callId, analysis });
        return analysis;
      }

      return null;

    } catch (error) {
      console.error(`❌ AMD analysis error for call ${callId}:`, error);
      return null;
    }
  }

  /**
   * Analyze transcript for AMD keywords and patterns
   */
  public analyzeTranscript(
    callId: string,
    transcript: string,
    audioMetrics?: AudioMetrics[]
  ): AMDAnalysis {
    const words = transcript.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const analysisStartTime = Date.now();

    // Keyword analysis
    const machineKeywordMatches = this.machineKeywords.filter(keyword => 
      transcript.toLowerCase().includes(keyword)
    );
    
    const humanKeywordMatches = this.humanIndicators.filter(keyword =>
      transcript.toLowerCase().includes(keyword)
    );

    // Pattern analysis
    const speechRate = this.calculateSpeechRate(transcript, audioMetrics);
    const pausePatterns = this.analyzePausePatterns(audioMetrics || []);
    const tonalVariation = this.calculateTonalVariation(audioMetrics || []);

    // Decision logic
    let confidence = 0.5; // Start neutral
    let isAnsweringMachine = false;
    let detectionMethod: AMDAnalysis['detectionMethod'] = 'keyword_pattern';
    let reasoning = '';

    // Strong machine indicators
    if (machineKeywordMatches.length > 0) {
      confidence = 0.9;
      isAnsweringMachine = true;
      detectionMethod = 'keyword_pattern';
      reasoning = `Machine keywords detected: ${machineKeywordMatches.join(', ')}`;
    }
    // Strong human indicators
    else if (humanKeywordMatches.length > 0 && wordCount < 20) {
      confidence = 0.85;
      isAnsweringMachine = false;
      detectionMethod = 'keyword_pattern';
      reasoning = `Human indicators detected: ${humanKeywordMatches.join(', ')}`;
    }
    // Long monologue without interaction
    else if (wordCount > 50 && audioMetrics && audioMetrics.length > 100) {
      const silenceCount = pausePatterns.filter(p => p > 1000).length;
      if (silenceCount < 2) {
        confidence = 0.8;
        isAnsweringMachine = true;
        detectionMethod = 'duration_pattern';
        reasoning = `Long continuous speech (${wordCount} words) without natural pauses`;
      }
    }
    // Monotone speech pattern
    else if (tonalVariation < this.detectionThresholds.monotoneThreshold) {
      confidence = 0.75;
      isAnsweringMachine = true;
      detectionMethod = 'voice_pattern';
      reasoning = `Monotone speech pattern detected (variation: ${tonalVariation.toFixed(2)})`;
    }
    // Short interactive response
    else if (wordCount < 10 && humanKeywordMatches.length > 0) {
      confidence = 0.8;
      isAnsweringMachine = false;
      detectionMethod = 'keyword_pattern';
      reasoning = `Short interactive response with human indicators`;
    }
    // Formal business greeting
    else if (transcript.includes('thank you for calling') || transcript.includes('you have reached')) {
      confidence = 0.95;
      isAnsweringMachine = true;
      detectionMethod = 'keyword_pattern';
      reasoning = `Formal business greeting detected`;
    }

    const timeToDetection = Date.now() - analysisStartTime;

    return {
      isAnsweringMachine,
      confidence,
      detectionMethod,
      indicators: {
        silenceGaps: pausePatterns.filter(p => p > this.detectionThresholds.longSilenceThreshold).length,
        averageEnergy: audioMetrics ? this.calculateAverageEnergy(audioMetrics) : 0,
        voiceDuration: audioMetrics ? this.calculateVoiceDuration(audioMetrics) : 0,
        speechRate,
        pausePatterns,
        keywords: [...machineKeywordMatches, ...humanKeywordMatches],
        tonalVariation
      },
      reasoning,
      timeToDetection
    };
  }

  private extractAudioMetrics(audioBuffer: Buffer, timestamp: number): AudioMetrics {
    // Simplified audio analysis - in production, use proper audio processing
    const samples = audioBuffer.length / 2; // Assuming 16-bit audio
    let energy = 0;
    let maxAmplitude = 0;

    for (let i = 0; i < audioBuffer.length; i += 2) {
      const sample = audioBuffer.readInt16LE(i);
      const amplitude = Math.abs(sample) / 32768; // Normalize to 0-1
      energy += amplitude * amplitude;
      maxAmplitude = Math.max(maxAmplitude, amplitude);
    }

    energy = Math.sqrt(energy / samples);
    const isSpeech = energy > 0.01; // Basic voice activity detection

    return {
      timestamp,
      energy,
      isSpeech,
      duration: 160, // Assuming 20ms chunks at 8kHz
      frequency: this.estimateFrequency(audioBuffer),
      amplitude: maxAmplitude
    };
  }

  private performAMDAnalysis(
    callId: string,
    metrics: AudioMetrics[],
    callDuration: number
  ): AMDAnalysis {
    const analysisStartTime = Date.now();

    // Calculate silence patterns
    const silenceGaps = this.calculateSilenceGaps(metrics);
    const averageEnergy = this.calculateAverageEnergy(metrics);
    const voiceDuration = this.calculateVoiceDuration(metrics);
    const energyVariation = this.calculateEnergyVariation(metrics);
    const pausePatterns = this.analyzePausePatterns(metrics);

    let confidence = 0.5;
    let isAnsweringMachine = false;
    let detectionMethod: AMDAnalysis['detectionMethod'] = 'energy_pattern';
    let reasoning = '';

    // Analysis logic
    const speechRatio = voiceDuration / callDuration;
    const silenceRatio = 1 - speechRatio;
    const longSilences = silenceGaps.filter(gap => gap > this.detectionThresholds.longSilenceThreshold).length;

    // Machine indicators
    if (silenceRatio > this.detectionThresholds.silenceRatio && longSilences > 2) {
      confidence = 0.8;
      isAnsweringMachine = true;
      detectionMethod = 'silence_pattern';
      reasoning = `High silence ratio (${(silenceRatio * 100).toFixed(1)}%) with long gaps`;
    }
    else if (energyVariation < this.detectionThresholds.energyVariationThreshold) {
      confidence = 0.75;
      isAnsweringMachine = true;
      detectionMethod = 'energy_pattern';
      reasoning = `Low energy variation suggests recorded message`;
    }
    else if (voiceDuration > this.detectionThresholds.longMonologueThreshold) {
      confidence = 0.7;
      isAnsweringMachine = true;
      detectionMethod = 'duration_pattern';
      reasoning = `Long continuous speech without interaction`;
    }
    // Human indicators
    else if (callDuration < this.detectionThresholds.shortResponseThreshold && averageEnergy > 0.1) {
      confidence = 0.8;
      isAnsweringMachine = false;
      detectionMethod = 'duration_pattern';
      reasoning = `Quick response with good energy levels`;
    }
    else if (energyVariation > 0.15 && pausePatterns.length > 3) {
      confidence = 0.75;
      isAnsweringMachine = false;
      detectionMethod = 'voice_pattern';
      reasoning = `Natural speech variation and pause patterns`;
    }

    const timeToDetection = Date.now() - analysisStartTime;

    return {
      isAnsweringMachine,
      confidence,
      detectionMethod,
      indicators: {
        silenceGaps: silenceGaps.length,
        averageEnergy,
        voiceDuration,
        speechRate: 0, // Will be calculated with transcript
        pausePatterns,
        keywords: [],
        tonalVariation: energyVariation
      },
      reasoning,
      timeToDetection
    };
  }

  // Helper methods
  private calculateSilenceGaps(metrics: AudioMetrics[]): number[] {
    const gaps: number[] = [];
    let silenceStart = -1;

    for (let i = 0; i < metrics.length; i++) {
      const isSilent = !metrics[i].isSpeech;
      
      if (isSilent && silenceStart === -1) {
        silenceStart = i;
      } else if (!isSilent && silenceStart !== -1) {
        const gapDuration = (i - silenceStart) * 160; // 160ms per chunk
        gaps.push(gapDuration);
        silenceStart = -1;
      }
    }

    return gaps;
  }

  private calculateAverageEnergy(metrics: AudioMetrics[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.energy, 0);
    return sum / metrics.length;
  }

  private calculateVoiceDuration(metrics: AudioMetrics[]): number {
    return metrics.filter(m => m.isSpeech).length * 160; // 160ms per chunk
  }

  private calculateEnergyVariation(metrics: AudioMetrics[]): number {
    if (metrics.length < 2) return 0;
    
    const speechMetrics = metrics.filter(m => m.isSpeech);
    if (speechMetrics.length < 2) return 0;

    const energies = speechMetrics.map(m => m.energy);
    const mean = energies.reduce((a, b) => a + b) / energies.length;
    const variance = energies.reduce((acc, energy) => acc + Math.pow(energy - mean, 2), 0) / energies.length;
    
    return Math.sqrt(variance);
  }

  private analyzePausePatterns(metrics: AudioMetrics[]): number[] {
    const patterns: number[] = [];
    let pauseStart = -1;

    for (let i = 0; i < metrics.length; i++) {
      const isPause = !metrics[i].isSpeech;
      
      if (isPause && pauseStart === -1) {
        pauseStart = i;
      } else if (!isPause && pauseStart !== -1) {
        const pauseDuration = (i - pauseStart) * 160;
        if (pauseDuration > 100) { // Only count meaningful pauses
          patterns.push(pauseDuration);
        }
        pauseStart = -1;
      }
    }

    return patterns;
  }

  private calculateSpeechRate(transcript: string, audioMetrics?: AudioMetrics[]): number {
    if (!audioMetrics || audioMetrics.length === 0) return 0;
    
    const words = transcript.split(/\s+/).length;
    const speechDuration = this.calculateVoiceDuration(audioMetrics) / 1000; // Convert to seconds
    
    return speechDuration > 0 ? words / speechDuration * 60 : 0; // Words per minute
  }

  private calculateTonalVariation(metrics: AudioMetrics[]): number {
    if (metrics.length < 2) return 0;
    
    const frequencies = metrics.map(m => m.frequency);
    const mean = frequencies.reduce((a, b) => a + b) / frequencies.length;
    const variance = frequencies.reduce((acc, freq) => acc + Math.pow(freq - mean, 2), 0) / frequencies.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private estimateFrequency(audioBuffer: Buffer): number {
    // Simplified frequency estimation
    // In production, use FFT or autocorrelation
    return 200 + Math.random() * 300; // Placeholder: 200-500 Hz range
  }

  // Public methods
  public getAMDResult(callId: string): AMDAnalysis | null {
    return this.analysisResults.get(callId) || null;
  }

  public clearCallData(callId: string): void {
    this.audioMetrics.delete(callId);
    this.analysisResults.delete(callId);
  }

  public updateThresholds(newThresholds: Partial<typeof this.detectionThresholds>): void {
    this.detectionThresholds = { ...this.detectionThresholds, ...newThresholds };
    console.log('🤖 AMD thresholds updated:', newThresholds);
  }

  public getSystemStats(): any {
    return {
      activeCalls: this.audioMetrics.size,
      detectedMachines: Array.from(this.analysisResults.values()).filter(r => r.isAnsweringMachine).length,
      detectedHumans: Array.from(this.analysisResults.values()).filter(r => !r.isAnsweringMachine).length,
      averageConfidence: this.calculateAverageConfidence(),
      thresholds: this.detectionThresholds
    };
  }

  private calculateAverageConfidence(): number {
    const results = Array.from(this.analysisResults.values());
    if (results.length === 0) return 0;
    
    const sum = results.reduce((acc, result) => acc + result.confidence, 0);
    return sum / results.length;
  }
}

// Singleton instance
export const advancedAMDService = new AdvancedAMDService();
export default advancedAMDService;