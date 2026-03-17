import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock audio files for now - in production, this would scan a directory
    // or fetch from a database of uploaded audio files
    const audioFiles = [
      'welcome_message.wav',
      'hold_music.mp3', 
      'queue_full_message.wav',
      'closing_hours_message.wav',
      'transfer_message.wav',
      'thank_you_message.wav',
      'please_wait_message.wav',
      'busy_message.wav',
      'maintenance_message.wav',
      'holiday_message.wav'
    ];

    return NextResponse.json({
      success: true,
      data: audioFiles,
      message: 'Audio files retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch audio files',
      data: []
    }, { status: 500 });
  }
}