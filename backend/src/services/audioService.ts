/**
 * Audio Service - Centralized Management for Pre-recorded Audio Prompts
 * 
 * Replaces Twilio TTS with pre-recorded MP3 files to reduce costs and improve performance.
 * 
 * Benefits:
 * - Cost reduction: $0 vs $0.04/minute for TTS
 * - Faster playback: No TTS synthesis delay (~500ms)
 * - Consistent quality: Professional voice every time
 * - Easy updates: Just replace MP3 file
 * 
 * Usage:
 *   twiml.play(AudioService.INBOUND_GREETING);
 * 
 * With fallback:
 *   AudioService.playWithFallback(twiml, 'inbound-greeting.mp3', 'Thank you for calling...');
 */

import twilio from 'twilio';

export class AudioService {
  /**
   * Base URL for audio CDN
   * Set via environment variable: AUDIO_CDN_URL
   * 
   * Options:
   * - AWS S3: https://omnivox-audio-prompts.s3.amazonaws.com
   * - Railway: https://froniterai-production.up.railway.app/audio
   * - Cloudflare R2: https://audio.omnivox.ai
   */
  private static BASE_URL = process.env.AUDIO_CDN_URL || 
    process.env.BACKEND_URL + '/audio' ||
    'https://froniterai-production.up.railway.app/audio';

  /**
   * Get full URL for audio file
   */
  static getUrl(filename: string): string {
    return `${this.BASE_URL}/${filename}`;
  }

  // ==========================================
  // HIGH PRIORITY - Customer-facing, high frequency
  // ==========================================

  /**
   * "Thank you for calling. Please hold while I connect you to an available agent."
   * Voice: British English, Female, Professional
   * Usage: Every inbound call
   */
  static readonly INBOUND_GREETING = 'inbound-greeting.mp3';

  /**
   * "All our agents are currently busy. Please call back later or leave a voicemail."
   * Voice: British English, Female, Empathetic
   * Usage: Queue overflow
   */
  static readonly AGENTS_BUSY = 'agents-busy.mp3';

  /**
   * "Please hold while we connect you to an agent."
   * Voice: American English, Female, Friendly
   * Usage: Every outbound call to customer
   */
  static readonly CUSTOMER_CONNECTING = 'customer-connecting-outbound.mp3';

  /**
   * "Sorry, all agents are currently busy. Please try again later."
   * Voice: American English, Female, Apologetic
   * Usage: Outbound call agent timeout
   */
  static readonly AGENTS_UNAVAILABLE = 'agents-unavailable.mp3';

  // ==========================================
  // MEDIUM PRIORITY - Internal/operational
  // ==========================================

  /**
   * "Transferring your call, please hold."
   * Voice: British English, Female, Calm
   */
  static readonly TRANSFER_INITIATING = 'transfer-initiating.mp3';

  /**
   * "The transfer was unsuccessful. Returning to original call."
   * Voice: British English, Female, Informative
   */
  static readonly TRANSFER_FAILED = 'transfer-failed.mp3';

  /**
   * "Your call is being placed on hold. Please wait for an available agent."
   * Voice: British English, Female, Reassuring
   */
  static readonly CALL_ON_HOLD = 'call-on-hold.mp3';

  /**
   * "Connecting you to the customer..."
   * Voice: American English, Female, Professional
   */
  static readonly AGENT_CONNECTING_INBOUND = 'agent-connecting-inbound.mp3';

  /**
   * "Connecting you to the customer."
   * Voice: American English, Female, Brief
   */
  static readonly AGENT_CONNECTING_CONFERENCE = 'agent-connecting-conference.mp3';

  /**
   * "You are now connected."
   * Voice: American English, Female, Confirmatory
   */
  static readonly AGENT_CONNECTED = 'agent-connected.mp3';

  // ==========================================
  // LOW PRIORITY - Error/edge cases
  // ==========================================

  /**
   * "Please leave your message after the beep. Press any key when finished."
   * Voice: British English, Female, Instructive
   */
  static readonly VOICEMAIL_PROMPT = 'voicemail-prompt.mp3';

  /**
   * "Thank you for your message. Goodbye."
   * Voice: British English, Female, Warm
   */
  static readonly VOICEMAIL_THANKYOU = 'voicemail-thankyou.mp3';

  /**
   * "We apologize, but we are experiencing technical difficulties. Please try again later."
   * Voice: American English, Female, Apologetic
   */
  static readonly SYSTEM_ERROR = 'system-error.mp3';

  /**
   * "Connection failed. Please try again."
   * Voice: American English, Female, Brief
   */
  static readonly CONNECTION_FAILED = 'connection-failed.mp3';

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Play audio file with silent fallback if file fails
   * NO TTS ALLOWED - If audio fails, call continues silently
   * 
   * @param twiml - Twilio VoiceResponse object
   * @param audioFilename - Filename (e.g., 'inbound-greeting.mp3')
   * @param fallbackText - Description for logging (NOT used for TTS)
   * 
   * @example
   * AudioService.playAudio(
   *   twiml,
   *   AudioService.INBOUND_GREETING,
   *   'Inbound greeting'
   * );
   */
  static playAudio(
    twiml: twilio.twiml.VoiceResponse,
    audioFilename: string,
    description: string = 'Audio file'
  ): void {
    const audioUrl = this.getUrl(audioFilename);
    console.log(`🎵 Playing ${description}:`, audioUrl);
    twiml.play(audioUrl);
    
    // If audio file fails to load, Twilio will automatically continue without playing anything
    // NO TTS FALLBACK - This is intentional to avoid unexpected charges
  }

  /**
   * @deprecated Use playAudio() instead - TTS fallback removed
   * This method is kept for backward compatibility but no longer supports TTS
   */
  static playWithFallback(
    twiml: twilio.twiml.VoiceResponse,
    audioFilename: string,
    fallbackText: string,
    voice?: any
  ): void {
    console.warn('⚠️ playWithFallback() is deprecated - TTS fallback has been removed');
    this.playAudio(twiml, audioFilename, fallbackText);
  }

  /**
   * @deprecated TTS support removed - use playAudio() instead
   * This method now ALWAYS plays audio, ignoring the useAudio parameter
   */
  static playOrSay(
    twiml: twilio.twiml.VoiceResponse,
    audioFilename: string,
    ttsText: string,
    useAudio: boolean = true,
    voice?: any
  ): void {
    console.warn('⚠️ playOrSay() is deprecated - TTS support has been removed');
    console.warn('⚠️ Always using audio file, ignoring useAudio parameter');
    this.playAudio(twiml, audioFilename, ttsText);
  }

  /**
   * Get all audio file URLs for preloading/testing
   */
  static getAllUrls(): { [key: string]: string } {
    return {
      INBOUND_GREETING: this.getUrl(this.INBOUND_GREETING),
      AGENTS_BUSY: this.getUrl(this.AGENTS_BUSY),
      CUSTOMER_CONNECTING: this.getUrl(this.CUSTOMER_CONNECTING),
      AGENTS_UNAVAILABLE: this.getUrl(this.AGENTS_UNAVAILABLE),
      TRANSFER_INITIATING: this.getUrl(this.TRANSFER_INITIATING),
      TRANSFER_FAILED: this.getUrl(this.TRANSFER_FAILED),
      CALL_ON_HOLD: this.getUrl(this.CALL_ON_HOLD),
      AGENT_CONNECTING_INBOUND: this.getUrl(this.AGENT_CONNECTING_INBOUND),
      AGENT_CONNECTING_CONFERENCE: this.getUrl(this.AGENT_CONNECTING_CONFERENCE),
      AGENT_CONNECTED: this.getUrl(this.AGENT_CONNECTED),
      VOICEMAIL_PROMPT: this.getUrl(this.VOICEMAIL_PROMPT),
      VOICEMAIL_THANKYOU: this.getUrl(this.VOICEMAIL_THANKYOU),
      SYSTEM_ERROR: this.getUrl(this.SYSTEM_ERROR),
      CONNECTION_FAILED: this.getUrl(this.CONNECTION_FAILED),
    };
  }

  /**
   * Verify all audio files are accessible
   * Useful for health checks
   */
  static async verifyAllFiles(): Promise<{ success: boolean; missing: string[] }> {
    const urls = this.getAllUrls();
    const missing: string[] = [];

    for (const [key, url] of Object.entries(urls)) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          console.warn(`⚠️ Audio file not accessible: ${key} - ${url}`);
          missing.push(key);
        }
      } catch (error) {
        console.error(`❌ Error checking audio file ${key}:`, error);
        missing.push(key);
      }
    }

    return {
      success: missing.length === 0,
      missing
    };
  }
}

export default AudioService;
