import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🎵 Serving demo recording stream 2');

    // Create a different audio tone for the second demo
    const sampleRate = 44100;
    const duration = 3; // 3 seconds
    const frequency = 523; // C note (higher pitch)
    const samples = sampleRate * duration;

    // Create WAV header
    const arrayBuffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate audio samples (sine wave with slight fade)
    for (let i = 0; i < samples; i++) {
      const fadeEnvelope = Math.min(1, i / (sampleRate * 0.1), (samples - i) / (sampleRate * 0.1));
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * fadeEnvelope;
      const intSample = Math.max(-32767, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }

    console.log('✅ Generated demo audio file 2');

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('❌ Demo recording error 2:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate demo recording' },
      { status: 500 }
    );
  }
}