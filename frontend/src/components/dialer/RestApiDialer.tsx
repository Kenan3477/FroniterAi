import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Device } from '@twilio/voice-sdk';
import { RootState } from '@/store';
import { startCall, answerCall, endCall } from '@/store/slices/activeCallSlice';
import { DispositionCard, DispositionData } from './DispositionCard';

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
  const [activeRestApiCall, setActiveRestApiCall] = useState<{callSid: string, conferenceId?: string, startTime: Date} | null>(null);
  const [audioDevices, setAudioDevices] = useState<{input: MediaDeviceInfo[], output: MediaDeviceInfo[]}>({input: [], output: []});
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Disposition modal state
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [pendingCallEnd, setPendingCallEnd] = useState<{callSid: string, duration: number} | null>(null);
  
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
              // Request microphone with enhanced audio settings for echo cancellation
              stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: false, // Disable AGC to prevent feedback
                  sampleRate: 16000, // Lower sample rate for better echo cancellation
                  channelCount: 1    // Mono audio to prevent stereo echo issues
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
              
              // Calculate call duration
              const startTime = activeRestApiCall?.startTime || new Date();
              const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
              
              // End call via backend API if we have call info
              if (activeRestApiCall?.callSid) {
                await endCallViaBackend(activeRestApiCall.callSid, 'customer-hangup');
                
                // Show disposition modal
                setPendingCallEnd({
                  callSid: activeRestApiCall.callSid,
                  duration: duration
                });
                setShowDispositionModal(true);
              }
              
              setCurrentCall(null);
              setActiveRestApiCall(null);
              
              console.log('📱 Customer disconnected - disposition modal should appear');
            });

            call.on('reject', () => {
              console.log('📱 Call rejected');
              setCurrentCall(null);
              dispatch(endCall());
            });
            
            call.on('cancel', () => {
              console.log('📱 Call cancelled');
              setCurrentCall(null);
              dispatch(endCall());
            });
            
            call.on('cancel', async () => {
              console.log('📱 Call cancelled by customer');
              
              // End call via backend API if we have call info - use activeRestApiCall for REST API calls
              if (activeRestApiCall?.callSid) {
                await endCallViaBackend(activeRestApiCall.callSid, 'customer-cancel');
              }
              
              setCurrentCall(null);
              // Don't clear Redux state immediately - let disposition modal handle it
              console.log('📱 Customer cancelled - disposition modal should appear');
            });
            
            call.on('error', async (error: any) => {
              console.error('❌ Call error:', error);
              
              // End call via backend API if we have call info
              if (activeRestApiCall?.callSid) {
                await endCallViaBackend(activeRestApiCall.callSid, 'call-error');
              }
              
              setCurrentCall(null);
              // Don't clear Redux state immediately - let disposition modal handle it
              console.log('📱 Call error - disposition modal should appear');
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

  // Helper function to end call via backend API
  const endCallViaBackend = async (callSid: string, autoDisposition?: string) => {
    const callDuration = activeRestApiCall?.startTime 
      ? Math.floor((new Date().getTime() - activeRestApiCall.startTime.getTime()) / 1000)
      : 0;
    
    console.log('📞 Call ended, preparing disposition...', { callSid, duration: callDuration });
    
    // If this is an automatic disposition (like customer-hangup), show modal for agent to provide real disposition
    if (autoDisposition) {
      console.log('📋 Showing disposition modal for agent input...');
      setPendingCallEnd({ callSid, duration: callDuration });
      setShowDispositionModal(true);
      return true; // Don't actually end the call yet, wait for disposition
    }
    
    // This will be called after disposition modal is filled out
    try {
      console.log('📞 Ending call via backend API:', { callSid, duration: callDuration });
      
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
          disposition: 'completed' // Generic status, real disposition comes from modal
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

  // Handle disposition modal submission
  const handleDispositionSubmit = async (dispositionData: DispositionData) => {
    if (!pendingCallEnd) return;
    
    try {
      // Save disposition to backend
      const response = await fetch('/api/calls/save-call-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          callSid: pendingCallEnd.callSid,
          duration: pendingCallEnd.duration,
          disposition: dispositionData.outcome,
          notes: dispositionData.notes,
          followUpRequired: dispositionData.followUpRequired,
          followUpDate: dispositionData.followUpDate,
          phoneNumber: phoneNumber,
          agentId: 'agent-browser' // TODO: Get real agent ID
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Call disposition saved successfully');
        
        // Now actually end the call in backend
        await endCallViaBackend(pendingCallEnd.callSid);
        
        // Clear Redux state now that disposition is complete
        dispatch(endCall());
        
        // Clear local state
        setShowDispositionModal(false);
        setPendingCallEnd(null);
        setActiveRestApiCall(null);
        
        setLastCallResult({
          success: true,
          message: 'Call completed and disposition saved'
        });
      } else {
        console.error('❌ Failed to save disposition:', result.error);
        alert('Failed to save call disposition. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving disposition:', error);
      alert('Failed to save call disposition. Please try again.');
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
      
      // Make REST API call through backend - CONFERENCE APPROACH
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
        console.log('✅ Conference call initiated:', result);
        
        setLastCallResult({
          success: true,
          callSid: result.callSid,
          conferenceId: result.conferenceId,
          status: result.status,
          method: 'Conference REST API',
          message: result.message
        });
        
        // Track the active REST API call with conference info
        setActiveRestApiCall({
          callSid: result.callSid,
          conferenceId: result.conferenceId,
          startTime: new Date()
        });
        
        // Wait 2 seconds then auto-join the agent to the conference
        console.log('⏳ Customer call initiated, joining agent to conference in 2 seconds...');
        setTimeout(async () => {
          await joinAgentToConference(result.conferenceId);
        }, 2000);
        
        onCallInitiated?.(result);
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

  // New function to join agent to conference via WebRTC
  const joinAgentToConference = async (conferenceId: string) => {
    try {
      console.log('👤 Joining agent to conference:', conferenceId);
      
      if (!device || !isDeviceReady) {
        throw new Error('WebRTC device not ready');
      }

      // Ensure we have microphone permission
      if (!microphonePermissionGranted || !microphoneStream) {
        console.log('🎤 Requesting microphone for conference call...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
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

      // Make WebRTC call to join conference
      const call = await device.connect({
        params: {
          conference: conferenceId
        }
      });

      console.log('✅ Agent joined conference successfully');
      setCurrentCall(call);

      // Set up call event handlers
      call.on('accept', () => {
        console.log('✅ Agent conference call accepted - two way audio active');
        
        // Update Redux state
        dispatch(startCall({
          phoneNumber: phoneNumber,
          callSid: activeRestApiCall?.callSid || '',
          callType: 'outbound',
          customerInfo: {
            firstName: 'Customer',
            lastName: '',
            phone: phoneNumber,
            id: `customer-${Date.now()}`
          }
        }));
        
        dispatch(answerCall());
        console.log('📱 Redux state updated - agent joined conference');
      });
      
      call.on('disconnect', () => {
        console.log('📱 Agent disconnected from conference');
        setCurrentCall(null);
        setActiveRestApiCall(null);
        dispatch(endCall());
      });
      
    } catch (error: any) {
      console.error('❌ Error joining conference:', error);
      alert(`Failed to join conference: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleHangup = async () => {
    if (activeRestApiCall) {
      try {
        setIsLoading(true);
        const callDuration = Math.floor((new Date().getTime() - activeRestApiCall.startTime.getTime()) / 1000);
        
        console.log('📞 Agent ending call, showing disposition modal...');
        
        // Show disposition modal instead of immediately ending with hardcoded disposition
        setPendingCallEnd({ 
          callSid: activeRestApiCall.callSid, 
          duration: callDuration 
        });
        setShowDispositionModal(true);
        
      } catch (error: any) {
        console.error('❌ Error preparing call end:', error);
        setLastCallResult({
          success: false,
          message: 'Failed to prepare call end: ' + error.message
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

    // End WebRTC call if active
    if (currentCall) {
      currentCall.disconnect();
      setCurrentCall(null);
      dispatch(endCall());
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
              title={isCollapsed ? "Expand dial pad" : "Collapse dial pad"}
            >
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {isCollapsed ? 'Click to expand dial pad' : 'Make outbound calls to customers'}
        </p>
      </div>

      {!isCollapsed && (
        <div className="p-4">
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

        {(currentCall || activeRestApiCall) && (
          <div className="mb-4">
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
            disabled={!phoneNumber || isLoading}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
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

        </div>
      )}

      {/* Disposition Modal */}
      {showDispositionModal && pendingCallEnd && (
        <DispositionCard
          isOpen={showDispositionModal}
          onSave={handleDispositionSubmit}
          onClose={() => {
            // Clear Redux state when modal is closed without saving
            dispatch(endCall());
            setShowDispositionModal(false);
            setPendingCallEnd(null);
            setActiveRestApiCall(null);
          }}
          customerInfo={{
            name: phoneNumber || 'Unknown',
            phoneNumber: phoneNumber || 'Unknown'
          }}
          callDuration={pendingCallEnd.duration}
        />
      )}
    </div>
  );
};