import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Device } from '@twilio/voice-sdk';
import { RootState } from '@/store';
import { startCall, answerCall, endCall } from '@/store/slices/activeCallSlice';

interface RestApiDialerProps {
  onCallInitiated?: (result: any) => void;
}

export const RestApiDialer: React.FC<RestApiDialerProps> = ({ onCallInitiated }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastCallResult, setLastCallResult] = useState<any>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);
  const [activeRestApiCall, setActiveRestApiCall] = useState<{callSid: string, startTime: Date} | null>(null);
  const [audioDevices, setAudioDevices] = useState<{input: MediaDeviceInfo[], output: MediaDeviceInfo[]}>({input: [], output: []});
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const deviceRef = useRef<Device | null>(null);

  // Get active call state from Redux
  const activeCall = useSelector((state: RootState) => state.activeCall);
  const dispatch = useDispatch();

  // Debug logging for device ready state
  useEffect(() => {
    console.log('🔍 Device ready state changed:', isDeviceReady);
  }, [isDeviceReady]);

  // Enumerate audio devices on component mount
  useEffect(() => {
    const setupAudioDevices = async () => {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get all audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInput = devices.filter(device => device.kind === 'audioinput');
        const audioOutput = devices.filter(device => device.kind === 'audiooutput');
        
        setAudioDevices({ input: audioInput, output: audioOutput });
        
        // Auto-select the first non-default output device (likely headset)
        const nonDefaultOutput = audioOutput.find(device => 
          device.deviceId !== 'default' && 
          device.label.toLowerCase().includes('headset') || 
          device.label.toLowerCase().includes('headphones')
        );
        
        if (nonDefaultOutput) {
          setSelectedAudioOutput(nonDefaultOutput.deviceId);
          console.log('🎧 Auto-selected audio output:', nonDefaultOutput.label);
        } else if (audioOutput.length > 0) {
          setSelectedAudioOutput(audioOutput[0].deviceId);
          console.log('🔊 Selected default audio output:', audioOutput[0].label);
        }
        
        console.log('🎵 Available audio devices:', { input: audioInput.length, output: audioOutput.length });
      } catch (error) {
        console.warn('⚠️ Could not enumerate audio devices:', error);
      }
    };
    
    setupAudioDevices();
  }, []);

  // Expose global call termination function for CustomerInfoCard
  useEffect(() => {
    (window as any).omnivoxTerminateCall = async () => {
      if (currentCall) {
        console.log('🔴 Terminating call via global function');
        currentCall.disconnect();
        
        // The disconnect handler will call the backend API
        return true;
      }
      return false;
    };

    return () => {
      delete (window as any).omnivoxTerminateCall;
    };
  }, [currentCall]);

  // Initialize Twilio Device for browser audio (to receive calls from REST API)
  useEffect(() => {
    const initializeDevice = async () => {
      // Prevent duplicate device initialization
      if (deviceRef.current) {
        console.log('🔄 Device already initialized, skipping...');
        return;
      }

      // Wait for audio devices to be enumerated
      if (audioDevices.output.length === 0) {
        console.log('⏳ Waiting for audio devices to be enumerated...');
        return;
      }

      try {
        console.log('🔄 Initializing WebRTC device for incoming calls...');
        
        // Get access token from backend
        const tokenResponse = await fetch('/api/calls/token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ agentId: 'agent-browser' })
        });
        
        if (!tokenResponse.ok) {
          throw new Error('Failed to get access token');
        }

        const { data } = await tokenResponse.json();
        
        // Initialize Twilio Device for incoming calls with better configuration  
        const twilioDevice = new Device(data.token, {
          logLevel: 'info', // Reduce debug spam
          allowIncomingWhileBusy: false, // Prevent multiple simultaneous calls
          enableImprovedSignalingErrorPrecision: true
        });

        // Set audio output device after device is ready
        twilioDevice.on('ready', async () => {
          console.log('✅ WebRTC Device ready for incoming calls');
          
          // Set audio output device if available and selected
          if (selectedAudioOutput && twilioDevice.audio && twilioDevice.audio.speakerDevices) {
            try {
              console.log('🎧 Setting audio output device:', selectedAudioOutput);
              await twilioDevice.audio.speakerDevices.set([selectedAudioOutput]);
              console.log('✅ Audio output device set to headset');
            } catch (error) {
              console.warn('⚠️ Could not set audio output device:', error);
            }
          }
          
          console.log('🔄 Setting device ready state to true');
          setIsDeviceReady(true);
        });

        twilioDevice.on('registered', () => {
          console.log('✅ WebRTC Device registered and ready for calls');
          console.log('🔄 Setting device ready state to true (via registered event)');
          setIsDeviceReady(true);
        });

        twilioDevice.on('error', (error) => {
          console.error('❌ WebRTC Device error:', error);
          setIsDeviceReady(false);
        });

        twilioDevice.on('incoming', async (call) => {
          console.log('📞 Incoming call from REST API - checking microphone...');
          
          // If we already have an active call, reject this new one
          if (currentCall) {
            console.log('⚠️ Already have an active call, rejecting new incoming call');
            call.reject();
            return;
          }
          
          try {
            let stream = microphoneStream;
            
            // If we don't have a stream yet, or permission wasn't granted, try to get one
            if (!stream || !microphonePermissionGranted) {
              console.log('🎤 Requesting microphone access for incoming call...');
              // Request microphone with high-quality audio settings
              stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                  sampleRate: 48000
                }
              });
              setMicrophoneStream(stream);
              setMicrophonePermissionGranted(true);
            }
            
            console.log('🎤 Microphone access confirmed - accepting call');
            
            // Set the current call immediately to prevent duplicates
            setCurrentCall(call);
            
            // Accept the call
            await call.accept();
            
            // Set up call event handlers
            call.on('accept', () => {
              console.log('✅ Call accepted - two way audio should be working');
              
              // Extract call information for Redux state
              const callParameters = call.parameters || {};
              const callerNumber = callParameters.From || 'Unknown';
              const callSid = call.parameters?.CallSid || call.sid || null;
              
              console.log('📞 Incoming call details:', { 
                from: callerNumber, 
                callSid: callSid,
                parameters: callParameters 
              });
              
              // Start call in Redux with proper metadata
              dispatch(startCall({
                phoneNumber: callerNumber,
                callSid: callSid,
                callType: 'inbound',
                customerInfo: {
                  firstName: 'Inbound',
                  lastName: 'Caller',
                  phone: callerNumber,
                  id: `inbound-${callSid || Date.now()}`
                }
              }));
              
              // Update to connected status
              dispatch(answerCall());
              console.log('📱 Redux state updated - inbound call started and answered');
            });
            
            call.on('disconnect', async () => {
              console.log('📱 Call disconnected by customer');
              
              // End call via backend API if we have call info
              if (activeCall.callSid) {
                await endCallViaBackend(activeCall.callSid, 'customer-hangup');
              }
              
              setCurrentCall(null);
              // Clear Redux state
              dispatch(endCall());
              console.log('📱 Redux state updated - call ended');
              // Don't stop the microphone stream here - keep it for next call
            });
            
            call.on('cancel', async () => {
              console.log('📱 Call cancelled by customer');
              
              // End call via backend API if we have call info
              if (activeCall.callSid) {
                await endCallViaBackend(activeCall.callSid, 'customer-cancel');
              }
              
              setCurrentCall(null);
              // Clear Redux state
              dispatch(endCall());
              console.log('📱 Redux state updated - call cancelled');
            });
            
            call.on('error', async (error: any) => {
              console.error('❌ Call error:', error);
              
              // End call via backend API if we have call info
              if (activeCall.callSid) {
                await endCallViaBackend(activeCall.callSid, 'call-error');
              }
              
              setCurrentCall(null);
              // Clear Redux state
              dispatch(endCall());
              console.log('📱 Redux state updated - call error');
              // Don't stop the microphone stream on error - keep it for next call
            });
            
          } catch (error) {
            console.error('❌ Microphone access denied during call:', error);
            setMicrophonePermissionGranted(false);
            alert('❌ Microphone access required for two-way audio. Please click "Test Microphone" first.');
            call.reject();
          }
        });

        console.log('🔧 About to register Twilio device...');
        await twilioDevice.register();
        setDevice(twilioDevice);
        deviceRef.current = twilioDevice;
        
      } catch (error) {
        console.error('❌ Failed to initialize WebRTC Device:', error);
      }
    };

    initializeDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
      // Clean up microphone stream
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioDevices, selectedAudioOutput]); // Re-initialize when audio devices change

  // Cleanup active REST API calls on unmount
  useEffect(() => {
    return () => {
      if (activeRestApiCall) {
        console.log('🧹 Component unmounting, cleaning up active REST API call');
        // Note: In a real app, you might want to end the call here
        // For now, just log it as the call might continue on the backend
      }
    };
  }, [activeRestApiCall]);

  const handleNumberClick = (digit: string) => {
    if (phoneNumber.length < 15) { // Reasonable limit for international numbers
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleClear = () => {
    setPhoneNumber('');
    setLastCallResult(null);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const testMicrophone = async () => {
    try {
      // Clean up any existing stream first
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
      }

      // Request microphone with high-quality audio settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      console.log('🎤 Microphone test successful - high-quality stream acquired');
      
      // Store the stream for future use
      setMicrophoneStream(stream);
      setMicrophonePermissionGranted(true);
      
      alert('✅ Microphone access granted! High-quality audio ready for calls.');
      
    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      setMicrophonePermissionGranted(false);
      alert('❌ Microphone access denied. Please allow microphone permissions in your browser.');
    }
  };

  const testAudioOutput = async () => {
    // Test audio output using the selected audio device
    try {
      // Use a simple data URL for a short beep sound
      const beepDataUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dzwm8jBSuDzvLZiTYIG2WzbdN5LQUleM7y2YkrBSlYxPHalUEOF1mw5PKAWAoKRrTc9shuYgkcYWa+8N1vJQUqfM/x24ksCCltqeTz1bAoGEa9yeSbY2I8JWmzv+LwgUZO5zOz9vbQhIlxN22c7p2YGScaXqPyq4ZBXA2G3Z2T6lw3Kt+FbNGR8KU5KSyB2KVa6eiwGAwNjMnL3Mk2fNJpBFwKNz85mC4fX1xZ7Dkn';
      
      const audioElement = new Audio(beepDataUrl);
      audioElement.volume = 0.4;
      
      // Set the audio output device if one is selected and supported
      if (selectedAudioOutput && (audioElement as any).setSinkId) {
        try {
          await (audioElement as any).setSinkId(selectedAudioOutput);
          console.log('🎧 Audio test routed to device:', selectedAudioOutput);
          
          // Find the device name for user feedback
          const selectedDevice = audioDevices.output.find(device => device.deviceId === selectedAudioOutput);
          const deviceName = selectedDevice ? selectedDevice.label || 'Selected Device' : 'Selected Device';
          
          await audioElement.play();
          alert(`🔊 Audio test played to: ${deviceName}\n\n✅ If you heard the beep through your intended device, audio routing is working correctly!`);
        } catch (sinkError) {
          console.warn('⚠️ Could not set audio output device:', sinkError);
          // Fallback to default device
          await audioElement.play();
          alert('🔊 Audio test played to default device.\n\n⚠️ Device selection may not be supported by this browser. Check your browser\'s audio settings.');
        }
      } else {
        // No device selected or setSinkId not supported
        await audioElement.play();
        if (!selectedAudioOutput) {
          alert('🔊 Audio test played to default device.\n\n💡 Tip: Select your headset from the "Audio Output Device" dropdown above, then test again.');
        } else {
          alert('🔊 Audio test played to default device.\n\n⚠️ Your browser may not support device selection (setSinkId not available).');
        }
      }
      
    } catch (error) {
      console.error('❌ Audio test failed:', error);
      alert('❌ Audio test failed. Your browser may not support audio output testing.');
    }
  };

  // Helper function to end call via backend API
  const endCallViaBackend = async (callSid: string, disposition: string) => {
    try {
      const callDuration = activeCall.callStartTime 
        ? Math.floor((new Date().getTime() - new Date(activeCall.callStartTime).getTime()) / 1000)
        : 0;
      
      console.log('📞 Ending call via backend API:', { callSid, duration: callDuration, disposition });
      
      const response = await fetch('/api/dialer/end', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          callSid: callSid,
          duration: callDuration,
          status: 'completed',
          disposition: disposition
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Call ended successfully via backend API');
        return true;
      } else {
        console.error('❌ Backend call end failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error calling backend API to end call:', error);
      return false;
    }
  };

  const handleCall = async () => {
    if (!phoneNumber) {
      alert('Please enter a customer phone number');
      return;
    }

    setIsLoading(true);
    setLastCallResult(null);

    try {
      console.log('📞 Making REST API call to:', phoneNumber);
      
      // Make REST API call through backend - SIMPLE DIRECT CALLING
      const response = await fetch('/api/calls/call-rest-api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          to: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLastCallResult({
          success: true,
          callSid: result.callSid,
          status: result.status,
          method: 'REST API',
          message: result.message
        });
        
        // Track the active REST API call
        setActiveRestApiCall({
          callSid: result.callSid,
          startTime: new Date()
        });
        
        onCallInitiated?.(result);
        console.log('✅ REST API call initiated:', result);
      } else {
        throw new Error(result.error || 'Failed to make call');
      }
      
    } catch (error: any) {
      console.error('❌ Error making REST API call:', error);
      setLastCallResult({ 
        success: false, 
        error: error.message || 'Failed to make call'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHangup = async () => {
    if (activeRestApiCall) {
      try {
        setIsLoading(true);
        const callDuration = Math.floor((new Date().getTime() - activeRestApiCall.startTime.getTime()) / 1000);
        
        // End the REST API call through backend
        const response = await fetch('/api/dialer/end', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ 
            callSid: activeRestApiCall.callSid,
            duration: callDuration,
            status: 'completed',
            disposition: 'agent-hangup'
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          setLastCallResult({
            success: true,
            message: 'Call ended successfully'
          });
          setActiveRestApiCall(null);
          console.log('✅ REST API call ended:', result);
        } else {
          throw new Error(result.error || 'Failed to end call');
        }
      } catch (error: any) {
        console.error('❌ Error ending REST API call:', error);
        setLastCallResult({
          success: false,
          message: 'Failed to end call: ' + error.message
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // For Twilio SDK calls or when no active call
      console.log('📞 No active REST API call to end');
      setLastCallResult({
        success: true,
        message: 'No active call to end'
      });
    }
  };

  const dialPadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  // Hide dialer UI when there's an active call, but keep Device running for incoming calls
  if (activeCall.isActive) {
    return (
      <div className="hidden">
        {/* RestApiDialer Device is running in background for incoming calls */}
        {/* UI hidden during active calls */}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Phone Dialer</h3>
          <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">Twilio REST API</span>
        </div>
        <p className="text-sm text-gray-600">Make outbound calls to customers</p>
      </div>

      <div className="p-4">
        {/* Audio Device Selection */}
        <div className="mb-4">
          <label htmlFor="audio-output" className="block text-sm font-medium text-gray-700 mb-2">
            Audio Output Device (for calls)
          </label>
          <select 
            id="audio-output"
            value={selectedAudioOutput}
            onChange={(e) => setSelectedAudioOutput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">System Default</option>
            {audioDevices.output.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Audio Device ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select your headset or preferred output device for call audio
          </p>
          {selectedAudioOutput && (
            <button 
              onClick={testAudioOutput}
              className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
            >
              🔊 Test Selected Device
            </button>
          )}
        </div>

        {/* Phone Number Display */}
        <div className="mb-4">
          <label htmlFor="customer-phone" className="block text-sm font-medium text-gray-700 mb-2">
            Customer Phone Number
          </label>
          <div className="relative">
            <input
              id="customer-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+447929717470"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
            />
            {phoneNumber && (
              <button
                onClick={handleBackspace}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ⌫
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Customer number to call
          </p>
        </div>

        {/* Dial Pad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {dialPadNumbers.flat().map((number) => (
            <button
              key={number}
              onClick={() => handleNumberClick(number)}
              className="h-12 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors font-semibold text-lg"
              disabled={isLoading}
            >
              {number}
            </button>
          ))}
        </div>

        {/* WebRTC Status */}
        {!isDeviceReady && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              🔄 Initializing browser audio for calls...
            </p>
          </div>
        )}
        
        {isDeviceReady && (
          <div className="mb-4 p-2 bg-green-50 border border-slate-200 rounded-md">
            <p className="text-xs text-slate-800">
              ✅ Browser audio ready - you can speak to customers
            </p>
            <p className="text-xs text-slate-600 mt-1">
              💡 Use "Test Audio" button to check if sound routes to your headset
            </p>
          </div>
        )}

        {/* Audio Device Status */}
        {selectedAudioOutput && (
          <div className="mb-4 p-2 bg-purple-50 border border-purple-200 rounded-md">
            <p className="text-xs text-purple-800">
              🎧 Audio Output: {audioDevices.output.find(d => d.deviceId === selectedAudioOutput)?.label || 'Selected Device'}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Click "Test Selected Device" above to verify audio routing
            </p>
          </div>
        )}
        
        {/* Microphone Status */}
        <div className={`mb-4 p-2 rounded-md ${
          microphonePermissionGranted 
            ? 'bg-green-50 border border-slate-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-xs ${
            microphonePermissionGranted ? 'text-slate-800' : 'text-yellow-800'
          }`}>
            {microphonePermissionGranted 
              ? '🎤✅ Microphone ready for two-way audio' 
              : '🎤⚠️ Click "Test Mic" to enable two-way audio'
            }
          </p>
        </div>

        {(currentCall || activeRestApiCall) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 font-medium">
              📞 Call in progress - Two-way audio should be working
              {activeRestApiCall && (
                <span className="block text-xs mt-1">
                  Call SID: {activeRestApiCall.callSid}
                </span>
              )}
            </p>
            <button
              onClick={() => {
                if (currentCall) {
                  currentCall.disconnect();
                } else if (activeRestApiCall) {
                  handleHangup();
                }
              }}
              disabled={isLoading}
              className={`mt-2 text-xs px-3 py-1 rounded text-white ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isLoading ? 'Ending...' : 'End Call'}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCall}
            disabled={!phoneNumber || isLoading || !isDeviceReady}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-slate-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Making Call...
              </span>
            ) : (
              '📞 Call Customer'
            )}
          </button>
          
          <button
            onClick={testMicrophone}
            className={`px-3 py-3 rounded-md transition-colors text-sm ${
              microphonePermissionGranted 
                ? 'bg-green-600 text-white hover:bg-slate-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={microphonePermissionGranted ? "Microphone ready" : "Test microphone permissions"}
          >
            {microphonePermissionGranted ? '🎤✅ Mic Ready' : '🎤 Test Mic'}
          </button>

          <button
            onClick={testAudioOutput}
            className="px-3 py-3 rounded-md transition-colors text-sm bg-purple-600 text-white hover:bg-purple-700"
            title="Test audio output to check if sound goes to headset or speakers"
          >
            🔊 Test Audio
          </button>
          
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors font-medium"
            title="Clear all fields"
          >
            Clear
          </button>
        </div>

        {/* Call Result */}
        {lastCallResult && (
          <div className={`p-3 rounded-md text-sm ${
            lastCallResult.success 
              ? 'bg-green-50 border border-slate-200 text-slate-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {lastCallResult.success ? (
              <div>
                <p className="font-medium">✅ Call initiated successfully!</p>
                <p className="text-xs mt-1">Call SID: {lastCallResult.callSid}</p>
                <p className="text-xs">Status: {lastCallResult.status}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">❌ Call failed</p>
                <p className="text-xs mt-1">{lastCallResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-800">
            <span className="font-medium">How it works:</span> REST API calls the customer, then connects them to your browser. 
            You'll hear the customer through your browser speakers and speak through your microphone.
          </p>
        </div>
      </div>
    </div>
  );
};