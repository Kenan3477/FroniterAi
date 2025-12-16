/**
 * Twilio Client Dialer - Browser-based calling using Twilio Voice SDK
 * Agent speaks through browser, calls go through backend API to Twilio
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import { 
  PhoneIcon, 
  PhoneArrowUpRightIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';
import * as dialerApi from '@/services/dialerApi';

interface TwilioClientDialerProps {
  agentId: string;
  callerIdNumber: string;
  onCallStart?: (phoneNumber: string) => void;
  onCallEnd?: (duration: number) => void;
}

export const TwilioClientDialer: React.FC<TwilioClientDialerProps> = ({
  agentId,
  callerIdNumber,
  onCallStart,
  onCallEnd
}) => {
  // Device state
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Call state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [isDialing, setIsDialing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);

  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    let mounted = true;
    let twilioDevice: Device | null = null;

    const initializeDevice = async () => {
      try {
        console.log('🔧 Initializing Twilio Device for agent:', agentId);
        
        // Get access token from backend
        const { token, identity } = await dialerApi.generateToken(agentId);
        console.log('✅ Got Twilio token for identity:', identity);

        // Create Twilio Device with region for UK
        twilioDevice = new Device(token, {
          logLevel: 1, // Debug level
          enableImprovedSignalingErrorPrecision: true,
          edge: 'dublin', // Use dublin edge for UK/Europe
        });

        if (!mounted) return;

        // Set up event handlers
        twilioDevice.on('registered', () => {
          console.log('✅ Twilio Device registered');
          if (mounted) {
            setIsDeviceReady(true);
            setDeviceError(null);
          }
        });

        twilioDevice.on('error', (error: any) => {
          console.error('❌ Twilio Device error:', error);
          if (mounted) {
            setDeviceError(error.message || 'Device error occurred');
            setIsDeviceReady(false);
          }
        });

        twilioDevice.on('incoming', (call: any) => {
          console.log('📞 Incoming call:', call);
          // Handle incoming calls if needed
        });

        // Register the device
        await twilioDevice.register();
        
        if (mounted) {
          setDevice(twilioDevice);
        }
      } catch (error: any) {
        console.error('❌ Failed to initialize Twilio Device:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          stack: error?.stack,
          fullError: error
        });
        
        if (mounted) {
          let errorMessage = error?.message || error?.toString() || 'Failed to initialize device';
          
          // Check for common TwiML App configuration error
          if (errorMessage.includes('TwiML') || errorMessage.includes('Application') || errorMessage.includes('31005')) {
            errorMessage = 'TwiML App not configured correctly. The App SID may be invalid or not linked to your Twilio account. Please verify the TwiML App exists and the SID is correct in backend/.env';
          }
          
          setDeviceError(errorMessage);
          setIsDeviceReady(false);
        }
      }
    };

    initializeDevice();

    // Cleanup
    return () => {
      mounted = false;
      if (twilioDevice) {
        console.log('🧹 Cleaning up Twilio Device');
        twilioDevice.destroy();
      }
    };
  }, [agentId]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'open') {
      durationIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const duration = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
          setCallDuration(duration);
        }
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle making a call
  const handleMakeCall = useCallback(async () => {
    if (!device || !isDeviceReady) {
      alert('Device not ready. Please wait...');
      return;
    }

    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber.trim())) {
      alert('Please enter a valid phone number in E.164 format (e.g., +447929717470)');
      return;
    }

    try {
      console.log('📞 Making call to:', phoneNumber);
      setIsDialing(true);
      setCallStatus('connecting');
      setCallDuration(0);

      // Make the call through Twilio Device
      const call = await device.connect({
        params: {
          To: phoneNumber.trim(),
          From: callerIdNumber,
        }
      });

      console.log('✅ Call initiated:', call);
      setActiveCall(call);
      onCallStart?.(phoneNumber.trim());

      // Set up call event handlers
      call.on('accept', () => {
        console.log('✅ Call accepted (ringing)');
        setCallStatus('ringing');
      });

      call.on('connect', () => {
        console.log('✅ Call connected');
        setCallStatus('open');
        setIsDialing(false);
        callStartTimeRef.current = new Date();
      });

      call.on('disconnect', () => {
        console.log('📴 Call disconnected');
        setCallStatus('closed');
        setIsDialing(false);
        const finalDuration = callDuration;
        setActiveCall(null);
        callStartTimeRef.current = null;
        setCallDuration(0);
        onCallEnd?.(finalDuration);
      });

      call.on('error', (error: any) => {
        console.error('❌ Call error:', error);
        setCallStatus('failed');
        setIsDialing(false);
        setActiveCall(null);
        callStartTimeRef.current = null;
        alert(`Call failed: ${error.message || 'Unknown error'}`);
      });

      call.on('cancel', () => {
        console.log('🚫 Call cancelled');
        setCallStatus('cancelled');
        setIsDialing(false);
        setActiveCall(null);
        callStartTimeRef.current = null;
      });

      call.on('reject', () => {
        console.log('🚫 Call rejected');
        setCallStatus('rejected');
        setIsDialing(false);
        setActiveCall(null);
        callStartTimeRef.current = null;
      });

    } catch (error: any) {
      console.error('❌ Failed to make call:', error);
      setIsDialing(false);
      setCallStatus('failed');
      setActiveCall(null);
      alert(`Failed to make call: ${error.message || 'Unknown error'}`);
    }
  }, [device, isDeviceReady, phoneNumber, callerIdNumber, onCallStart, onCallEnd, callDuration]);

  // Handle ending a call
  const handleEndCall = useCallback(() => {
    if (activeCall) {
      console.log('📴 Ending call');
      activeCall.disconnect();
    }
  }, [activeCall]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    if (activeCall) {
      const newMuteState = !isMuted;
      activeCall.mute(newMuteState);
      setIsMuted(newMuteState);
      console.log(newMuteState ? '🔇 Muted' : '🔊 Unmuted');
    }
  }, [activeCall, isMuted]);

  // Handle DTMF digit
  const handleDTMF = useCallback((digit: string) => {
    if (activeCall && callStatus === 'open') {
      console.log('📟 Sending DTMF:', digit);
      activeCall.sendDigits(digit);
    }
  }, [activeCall, callStatus]);

  // Dial pad digits
  const dialPadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="space-y-4">
      {/* Device Status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          {isDeviceReady ? (
            <>
              <SignalIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">Device Ready</span>
            </>
          ) : (
            <>
              <SignalSlashIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">
                {deviceError || 'Initializing...'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Phone Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+447929717470"
          disabled={!!activeCall}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500">Enter number in E.164 format (e.g., +447929717470)</p>
      </div>

      {/* Call Controls */}
      {!activeCall ? (
        <button
          onClick={handleMakeCall}
          disabled={!isDeviceReady || isDialing}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <PhoneArrowUpRightIcon className="w-5 h-5" />
          <span className="font-medium">
            {isDialing ? 'Calling...' : 'Make Call'}
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          {/* Call Status */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {callStatus === 'connecting' && '📞 Connecting...'}
                {callStatus === 'ringing' && '📞 Ringing...'}
                {callStatus === 'open' && '✅ Connected'}
              </span>
              <span className="text-lg font-mono font-bold text-blue-600">
                {formatDuration(callDuration)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {phoneNumber}
            </div>
          </div>

          {/* Call Control Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleMuteToggle}
              className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                isMuted
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
              <span className="font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              onClick={handleEndCall}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
              <span className="font-medium">End Call</span>
            </button>
          </div>

          {/* DTMF Dial Pad */}
          {callStatus === 'open' && (
            <div className="mt-4">
              <button
                onClick={() => setIsDialPadOpen(!isDialPadOpen)}
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {isDialPadOpen ? 'Hide Dial Pad' : 'Show Dial Pad'}
              </button>

              {isDialPadOpen && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {dialPadDigits.map((digit) => (
                    <button
                      key={digit}
                      onClick={() => handleDTMF(digit)}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-colors"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
