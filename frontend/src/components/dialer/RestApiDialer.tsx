import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Device } from '@twilio/voice-sdk';
import { useAuth } from '@/contexts/AuthContext';
import { RootState } from '@/store';
import { startCall, answerCall, endCall, clearCall } from '@/store/slices/activeCallSlice';
import { DispositionCard, DispositionData } from './DispositionCard';

interface RestApiDialerProps {
  onCallInitiated?: (result: any) => void;
  onCallCompleted?: () => void; // NEW: Callback to refresh data after call completion
  campaignId?: string; // NEW: Allow passing campaign information
  campaignName?: string; // NEW: Allow passing campaign name
}

export const RestApiDialer: React.FC<RestApiDialerProps> = ({ 
  onCallInitiated, 
  onCallCompleted,
  campaignId = 'DAC', // Default to DAC campaign
  campaignName = 'Dial a Contact Campaign'
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastCallResult, setLastCallResult] = useState<any>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);
  const [activeRestApiCall, setActiveRestApiCall] = useState<{callSid: string, conferenceId?: string, startTime: Date} | null>(null);

  // 🛡️ Refs that mirror the latest values of state used inside the Twilio Device
  // 'incoming' listener. The listener is registered once when the Device is set up
  // and captures `phoneNumber`, `currentCall` and `activeRestApiCall` via closure.
  // Without these refs, by the time a second/third dial happens those closures
  // are reading the *initial* render's state, which is what previously made the
  // outbound-vs-inbound detection unreliable and produced ghost "+442046343130 /
  // Inbound Caller" rows. We update each ref whenever the underlying state
  // changes (cheap useEffects below) so the listener always sees fresh values.
  const phoneNumberRef = useRef<string>('');
  const currentCallRef = useRef<any>(null);
  const activeRestApiCallRef = useRef<{ callSid: string; conferenceId?: string; startTime: Date } | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const microphonePermissionGrantedRef = useRef<boolean>(false);

  // 🛡️ Tracks the callSid of the call that has already triggered the disposition
  // modal. The modal can be triggered from any of: agent's manual hangup,
  // Twilio Device 'disconnect'/'cancel'/'error' events, the backend
  // /api/calls/end success branch (legacy code), or the live-status poll when
  // it sees a terminal state. Without dedup, a single call can show the modal
  // 2-3 times — and submitting each one wrote a separate CallRecord, which is
  // exactly the "two records for one call" symptom the user reported.
  // showDispositionForCall(callSid) is the only allowed way to open the modal.
  const dispositionShownForCallRef = useRef<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<{input: MediaDeviceInfo[], output: MediaDeviceInfo[]}>({input: [], output: []});
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [inCallKeypadOpen, setInCallKeypadOpen] = useState(false);
  const [lastDtmfSent, setLastDtmfSent] = useState<string | null>(null);
  // Real-time call status polled from Twilio via backend
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'no-answer' | 'canceled' | 'failed'>('idle');
  const callStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get authenticated user for agent ID
  const { user } = useAuth();
  const agentId = user?.id?.toString() || user?.username || 'demo-agent';
  
  // Disposition modal state
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [pendingCallEnd, setPendingCallEnd] = useState<{
    callSid: string;
    duration: number;
    conferenceId?: string;
  } | null>(null);
  
  const deviceRef = useRef<Device | null>(null);

  // Get active call state from Redux
  const activeCall = useSelector((state: RootState) => state.activeCall);
  const dispatch = useDispatch();

  const authBearer = () =>
    localStorage.getItem('authToken') ||
    localStorage.getItem('omnivox_token') ||
    '';

  // 🛡️ Boolean derived from audioDevices used as the Device-init effect's dep.
  // Flips false→true once, the moment audio device enumeration first returns
  // any output devices, then stays true for the rest of the component's life.
  const audioDevicesReady = audioDevices.output.length > 0;

  // 🛡️ Keep refs in sync with the state values that the Twilio Device 'incoming'
  // listener reads. The listener is registered once but fires on every call, so
  // any state read via closure becomes stale after the first call.
  useEffect(() => { phoneNumberRef.current = phoneNumber; }, [phoneNumber]);
  useEffect(() => { currentCallRef.current = currentCall; }, [currentCall]);
  useEffect(() => {
    if (!currentCall) {
      setInCallKeypadOpen(false);
      setLastDtmfSent(null);
    }
  }, [currentCall]);
  useEffect(() => { activeRestApiCallRef.current = activeRestApiCall; }, [activeRestApiCall]);
  useEffect(() => { microphoneStreamRef.current = microphoneStream; }, [microphoneStream]);
  useEffect(() => { microphonePermissionGrantedRef.current = microphonePermissionGranted; }, [microphonePermissionGranted]);

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
            'Authorization': `Bearer ${authBearer()}`
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
          // 🛡️ Read latest values via refs — see comment on the ref declarations.
          // `currentCallRef.current`, `activeRestApiCallRef.current` and
          // `phoneNumberRef.current` are guaranteed to reflect the most recent
          // render's state, even though this listener was registered once.
          const activeRest = activeRestApiCallRef.current;
          const dialedNumber = phoneNumberRef.current;

          // 🛡️ DIRECTION DETECTION (deterministic).
          //
          // The agent-leg of an outbound REST-API call arrives at this Device as
          // an 'incoming' event because we registered the Device as the
          // `agent-browser` Twilio Client and our outbound TwiML does
          // <Dial><Client>agent-browser</Client></Dial>.
          //
          // The previous heuristic compared `phoneNumber` (the dial-pad input
          // state) against the empty string. That was unreliable for two
          // reasons:
          //   1. The user clears the input before the call connects, so by the
          //      time the agent-leg arrives `phoneNumber === ''` and we
          //      incorrectly classified it as INBOUND.
          //   2. The `incoming` listener was created once and read state via
          //      closure, so on the 2nd+ dial it saw the initial render's
          //      empty string regardless.
          //
          // The deterministic signal: if we initiated an outbound REST call in
          // the last 60 seconds (`activeRestApiCall` is set), this incoming
          // event IS the agent leg of that call. There is no realistic race
          // where a genuine inbound rings the agent-browser within 60s of an
          // outbound being dialled by the same agent — the backend's
          // active-call check (returns HTTP 409) prevents that.
          const OUTBOUND_LEG_WINDOW_MS = 60_000;
          const recentOutbound =
            activeRest &&
            Date.now() - activeRest.startTime.getTime() < OUTBOUND_LEG_WINDOW_MS;
          const isOutboundCall = !!recentOutbound;

          console.log('📞 Incoming call event:', {
            classifiedAs: isOutboundCall ? 'OUTBOUND (agent leg)' : 'INBOUND',
            activeRestCallSid: activeRest?.callSid,
            activeRestConferenceId: activeRest?.conferenceId,
            ageMs: activeRest ? Date.now() - activeRest.startTime.getTime() : null,
            currentCallSet: !!currentCallRef.current,
            dialedNumberInState: dialedNumber || null,
            twilioParams: call.parameters || {},
          });

          // If we already have an active call, reject this new one.
          if (currentCallRef.current) {
            console.log('⚠️ Already have an active call, rejecting new incoming call');
            call.reject();
            return;
          }

          try {
            let stream = microphoneStreamRef.current;

            // If we don't have a stream yet, or permission wasn't granted, try to get one.
            if (!stream || !microphonePermissionGrantedRef.current) {
              console.log('🎤 Requesting microphone access for incoming call...');
              stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: false, // Disable AGC to prevent feedback
                  sampleRate: 16000,      // Lower sample rate for better echo cancellation
                  channelCount: 1,        // Mono audio to prevent stereo echo issues
                },
              });
              setMicrophoneStream(stream);
              setMicrophonePermissionGranted(true);
            }

            console.log('🎤 Microphone access confirmed - accepting call');

            // Set the current call immediately to prevent duplicates.
            setCurrentCall(call);
            currentCallRef.current = call; // also set ref synchronously

            await call.accept();

            // Set up call event handlers.
            call.on('accept', () => {
              console.log('✅ Call accepted - two way audio should be working');

              const callParameters = call.parameters || {};

              // 🛡️ Customer number resolution.
              //
              // For OUTBOUND (agent-leg): the customer is the number we dialed.
              // We trust `activeRestApiCall.callSid` (the customer-leg SID) and
              // `phoneNumberRef.current` only as the display number. We DO NOT
              // use callParameters.From here because for the agent-leg of an
              // outbound bridge `From` is our Twilio caller-id number
              // (e.g. +442046343130) — the source of the previous ghost row.
              //
              // For INBOUND: the customer is callParameters.From (caller's
              // number), and there is no conferenceId in our state.
              const customerNumber = isOutboundCall
                ? (dialedNumber && dialedNumber.trim()) || activeRest?.conferenceId || 'Customer'
                : callParameters.From || 'Unknown';

              // 🛡️ Use the customer-leg SID (stored in activeRest) for OUTBOUND
              // calls — that's the SID our backend has on the `conf-...` row.
              // For INBOUND we use the agent-leg SID Twilio gave us, since
              // that's the only SID we have.
              const callSid = isOutboundCall
                ? activeRest?.callSid || call.parameters?.CallSid || (call as any).sid || null
                : call.parameters?.CallSid || (call as any).sid || null;

              const conferenceId = isOutboundCall ? activeRest?.conferenceId : undefined;

              console.log('📞 Call details (post-classification):', {
                direction: isOutboundCall ? 'outbound' : 'inbound',
                customer: customerNumber,
                callSid,
                conferenceId,
                twilioFrom: callParameters.From,
                twilioTo: callParameters.To,
              });

              // Sanity guard: if for an outbound call the customer number we
              // would write into Redux equals the Twilio caller-id From (i.e.
              // the previous bug pattern), refuse to use it and fall back to
              // the conferenceId as a marker. This makes the ghost +442046343130
              // pattern impossible at the source.
              const looksLikeAgentLegLeak =
                isOutboundCall &&
                callParameters.From &&
                customerNumber === callParameters.From;
              if (looksLikeAgentLegLeak) {
                console.warn(
                  '🛡️ Suppressing agent-leg From leak into Redux phoneNumber:',
                  callParameters.From,
                );
              }

              const safeCustomerNumber = looksLikeAgentLegLeak
                ? activeRest?.conferenceId || 'Customer'
                : customerNumber;

              dispatch(
                startCall({
                  phoneNumber: safeCustomerNumber,
                  callSid,
                  conferenceId,
                  callType: isOutboundCall ? 'outbound' : 'inbound',
                  customerInfo: {
                    firstName: isOutboundCall ? 'Customer' : 'Inbound',
                    lastName: isOutboundCall ? '' : 'Caller',
                    phone: safeCustomerNumber,
                    id: `${isOutboundCall ? 'outbound' : 'inbound'}-${callSid || Date.now()}`,
                  },
                }),
              );

              dispatch(answerCall());
              console.log(
                `📱 Redux state updated - ${isOutboundCall ? 'outbound' : 'inbound'} call started and answered`,
              );
            });
            
            call.on('disconnect', async () => {
              console.log('📱 Call disconnected - customer or network hangup detected');

              // Always read the freshest activeRestApiCall via the ref.
              const activeRestNow = activeRestApiCallRef.current;
              const startTime = activeRestNow?.startTime || new Date();
              const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

              stopCallStatusPolling();
              setCallStatus('completed');

              if (activeRestNow?.callSid) {
                console.log('🔚 Ending call on agent side and showing disposition modal...');

                await endCallViaBackend(activeRestNow.callSid, 'customer-hangup');
                showDispositionForCall(
                  activeRestNow.callSid,
                  duration,
                  activeRestNow.conferenceId,
                );

                // Clear local call state (agent's call is ended)
                setCurrentCall(null);
                currentCallRef.current = null;
                setActiveRestApiCall(null);
                activeRestApiCallRef.current = null;

                dispatch(endCall());
              } else {
                // Inbound or recovered-state call: still end Redux state.
                setCurrentCall(null);
                currentCallRef.current = null;
                dispatch(endCall());
              }

              console.log('✅ Customer disconnected - agent call ended, disposition modal shown');
            });

            call.on('reject', () => {
              console.log('📱 Call rejected by customer');
              setCurrentCall(null);
              currentCallRef.current = null;
              setActiveRestApiCall(null);
              activeRestApiCallRef.current = null;
              dispatch(endCall());
            });

            call.on('cancel', async () => {
              console.log('📱 Call cancelled - customer or agent cancelled before answer');

              const activeRestNow = activeRestApiCallRef.current;
              const startTime = activeRestNow?.startTime || new Date();
              const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

              stopCallStatusPolling();
              setCallStatus('canceled');

              if (activeRestNow?.callSid) {
                console.log('🔚 Ending cancelled call on agent side and showing disposition modal...');

                await endCallViaBackend(activeRestNow.callSid, 'customer-cancel');
                showDispositionForCall(
                  activeRestNow.callSid,
                  duration,
                  activeRestNow.conferenceId,
                );
              }

              setCurrentCall(null);
              currentCallRef.current = null;
              setActiveRestApiCall(null);
              activeRestApiCallRef.current = null;
              dispatch(endCall());

              console.log('✅ Call cancelled - agent call ended, disposition modal shown');
            });

            call.on('error', async (error: any) => {
              console.error('❌ Call error:', error);

              const activeRestNow = activeRestApiCallRef.current;
              if (activeRestNow?.callSid) {
                await endCallViaBackend(activeRestNow.callSid, 'call-error');
              }

              setCurrentCall(null);
              currentCallRef.current = null;
              // Don't clear Redux state immediately - let disposition modal handle it.
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
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // 🛡️ Initialise the Twilio Device once, as soon as audio devices are
    // available. We deliberately do NOT depend on `selectedAudioOutput` or the
    // full `audioDevices` object here: changing the speaker mid-session — or
    // having the OS hot-swap a USB headset — must NOT destroy & re-register
    // the Device, because that would lose the registered 'incoming' listener
    // and a fresh listener would capture stale state on the next call.
    // The dep below only changes when audio enumeration first completes, so
    // this effect runs exactly once per component mount.
    // Speaker changes are applied to the existing Device by the speaker
    // effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioDevicesReady]);

  // Apply speaker selection to the live Device without re-registering it.
  useEffect(() => {
    const dev: any = deviceRef.current;
    if (!dev || !selectedAudioOutput) return;
    if (dev.audio?.speakerDevices?.set) {
      dev.audio.speakerDevices.set([selectedAudioOutput]).catch((err: any) => {
        console.warn('⚠️ Could not update audio output device on live Device:', err);
      });
    }
  }, [selectedAudioOutput, isDeviceReady]);

  // Cleanup active REST API calls on unmount
  useEffect(() => {
    return () => {
      stopCallStatusPolling();
      if (activeRestApiCall) {
        console.log('🧹 Component unmounting, cleaning up active REST API call');
      }
    };
  }, [activeRestApiCall]);

  /**
   * The single-source way to show the disposition modal for an ended call.
   * Returns true if the modal was shown (first call for this SID), false if
   * it was a duplicate trigger and was suppressed.
   *
   * Resets when:
   *   - The disposition is successfully submitted (handleDispositionSubmit).
   *   - The user closes the modal without saving (DispositionCard onClose).
   *   - A new outbound call starts (handleCall sets activeRestApiCall).
   */
  const showDispositionForCall = (
    callSid: string | undefined | null,
    duration: number,
    conferenceId?: string | null,
  ): boolean => {
    if (!callSid) {
      console.warn('🛡️ showDispositionForCall called without callSid — ignoring');
      return false;
    }
    if (dispositionShownForCallRef.current === callSid) {
      console.log(
        `🛡️ Disposition already shown for ${callSid}; suppressing duplicate trigger`,
      );
      return false;
    }
    console.log(`📋 Showing disposition modal for ${callSid} (dedup gate)`);
    dispositionShownForCallRef.current = callSid;
    setPendingCallEnd({
      callSid,
      duration,
      ...(conferenceId ? { conferenceId } : {}),
    });
    setShowDispositionModal(true);
    return true;
  };

  const handleNumberClick = (digit: string) => {
    if (phoneNumber.length < 16) { // +447714333569 = 13 chars, allow up to 16 for international
      setPhoneNumber(prev => prev + digit);
    }
  };

  // Normalise any phone number to E.164 format before sending to backend
  const normalisePhoneNumber = (raw: string): string => {
    const trimmed = raw.trim();
    const stripped = trimmed.replace(/\D/g, ''); // digits only

    // Already E.164 — pass through untouched
    if (trimmed.startsWith('+')) {
      return trimmed;
    }

    // ── UK DETECTION (leading 0 is the definitive UK indicator) ──────────────

    // UK domestic format: 11 digits starting with 0
    // Covers: 07xxx (mobile), 01xxx (landline), 02xxx (London/Cardiff/etc), 03xxx, 08xxx
    if (stripped.startsWith('0') && stripped.length === 11) {
      return '+44' + stripped.substring(1); // 07714333569 → +447714333569
    }

    // UK country code already present: 44 + 10 digits = 12 digits total
    if (stripped.startsWith('44') && stripped.length === 12) {
      return '+' + stripped; // 447714333569 → +447714333569
    }

    // UK mobile without leading 0: 10 digits starting with 7
    if (stripped.length === 10 && stripped.startsWith('7')) {
      return '+44' + stripped; // 7714333569 → +447714333569
    }

    // UK landline without leading 0: 10 digits starting with known UK area code prefixes
    // UK area codes begin with 11–19 (01xxx), 20–29 (02xxx), 30–33 (03xxx)
    if (stripped.length === 10) {
      const twoDigit = parseInt(stripped.substring(0, 2), 10);
      const isLikelyUK =
        (twoDigit >= 11 && twoDigit <= 19) || // 01xxx area codes
        (twoDigit >= 20 && twoDigit <= 29) || // 02xxx (London, Belfast, Cardiff, etc.)
        twoDigit === 30 || twoDigit === 31 || twoDigit === 33; // 03xxx

      if (isLikelyUK) {
        console.log(`📞 Normalised ${stripped} as UK landline (prefix: ${twoDigit})`);
        return '+44' + stripped; // 1234567890 → +441234567890
      }

      // Default 10-digit: US/Canada
      return '+1' + stripped;
    }

    // ── US / CANADA ───────────────────────────────────────────────────────────

    // 11 digits starting with 1 = US/Canada with country code
    if (stripped.startsWith('1') && stripped.length === 11) {
      return '+' + stripped; // 17145551234 → +17145551234
    }

    // ── FALLBACK ─────────────────────────────────────────────────────────────

    return '+' + stripped;
  };

  const handleClear = () => {
    setPhoneNumber('');
    setLastCallResult(null);
    setCallStatus('idle');
    stopCallStatusPolling();
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  // Helper function to end call via backend API.
  // Reads the live activeRestApiCall via the ref so it works correctly when
  // called from the long-lived 'incoming' listener (which captures the
  // initial render's closure).
  const endCallViaBackend = async (callSid: string, autoDisposition?: string) => {
    const liveStart = activeRestApiCallRef.current?.startTime;
    const callDuration = liveStart
      ? Math.floor((new Date().getTime() - liveStart.getTime()) / 1000)
      : 0;
    
    console.log('📞 Ending call immediately via backend...', { callSid, duration: callDuration, trigger: autoDisposition || 'manual' });
    
    try {
      // CRITICAL: End the call in backend FIRST, regardless of disposition
      // This ensures the call is marked as ended immediately when customer hangs up
      // The disposition modal is shown AFTER the call is ended to collect additional details
      const response = await fetch('/api/calls/end', {  // ✅ FIXED: Correct endpoint
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authBearer()}`
        },
        body: JSON.stringify({ 
          callSid: callSid,
          duration: callDuration,
          status: 'completed',
          disposition: autoDisposition || 'completed',
          endedBy: autoDisposition === 'customer-hangup' ? 'customer' : 
                   autoDisposition === 'customer-cancel' ? 'customer' : 'agent'
        })
      });
      
      const result = await response.json();

      if (result.success) {
        console.log('✅ Call ended successfully in backend');
      } else {
        console.error('❌ Backend call end failed:', result.error);
      }

      // Pure backend helper — do not open disposition here (callers use showDispositionForCall).
      return !!result.success;
    } catch (error) {
      console.error('❌ Error ending call via backend:', error);
      return false;
    }
  };

  // Handle disposition modal submission
  const handleDispositionSubmit = async (dispositionData: DispositionData) => {
    if (!pendingCallEnd) return;
    
    try {
      console.log('💾 Submitting disposition data:', dispositionData);
      console.log('🔍 DEBUG: activeRestApiCall state:', activeRestApiCall);
      console.log('🔍 DEBUG: conferenceId:', pendingCallEnd.conferenceId || activeCall.conferenceId);
      console.log('🔍 DEBUG: callSid:', pendingCallEnd.callSid);
      
      const conferenceIdForSave =
        pendingCallEnd.conferenceId ||
        activeCall.conferenceId ||
        undefined;

      // Save disposition to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app'}/api/calls/save-call-data`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authBearer()}`
        },
        body: JSON.stringify({
          callSid: pendingCallEnd.callSid,
          conferenceId: conferenceIdForSave, // conf-xxx to merge with preliminary call record
          duration: pendingCallEnd.duration,
          disposition: {
            id: dispositionData.id,
            name: dispositionData.outcome,
            outcome: dispositionData.outcome
          },
          dispositionId: dispositionData.id, // Add explicit dispositionId field
          notes: dispositionData.notes,
          followUpRequired: dispositionData.followUpRequired,
          followUpDate: dispositionData.followUpDate,
          phoneNumber: phoneNumber,
          agentId: String(agentId) // Convert to string for database compatibility
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Call disposition saved successfully');

        // ✅ CRITICAL: Clear ALL call-related state after disposition submission
        // This ensures no lingering state blocks future calls
        setShowDispositionModal(false);
        setPendingCallEnd(null);

        // Reset the dedup gate so the next call (with a new SID) can show
        // its own disposition modal.
        dispositionShownForCallRef.current = null;

        // 🔥 FORCE CLEAR call state (in case disconnect handler didn't run)
        setActiveRestApiCall(null);
        activeRestApiCallRef.current = null;
        setCurrentCall(null);
        currentCallRef.current = null;
        setCallStatus('idle');
        
        // Clear Redux state
        dispatch(endCall());
        dispatch(clearCall());
        
        console.log('🧹 All call state cleared after disposition submission');
        
        // Refresh work page data
        if (onCallCompleted) {
          console.log('🔄 Triggering data refresh after call completion...');
          onCallCompleted();
        }
        
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

    // 🚀 SPEED OPTIMIZATION: WebRTC Device NOT required for REST API calls
    // Device only needed for incoming calls (agent receives call in browser)
    // For outbound REST API calls, Twilio handles everything server-side
    // This removes the 60-second wait that was blocking users
    
    console.log('📞 REST API Call - WebRTC Device check skipped (not required)');

    setIsLoading(true);
    setCallStatus('initiating');
    setLastCallResult(null);

    try {
      console.log('📞 Making REST API call to:', phoneNumber);
      console.log('✅ Device status:', { device: !!device, isDeviceReady });
      
      // Normalise number to E.164 before sending - handles UK 07xxx, US 10-digit, etc.
      const normalisedNumber = normalisePhoneNumber(phoneNumber);
      console.log('📞 Normalised number:', { original: phoneNumber, normalised: normalisedNumber });

      // Make REST API call through backend
      const response = await fetch('/api/calls/call-rest-api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authBearer()}`
        },
        body: JSON.stringify({ 
          to: normalisedNumber,
          campaignId: campaignId,
          campaignName: campaignName,
          agentId: agentId
        })
      });
      
      const result = await response.json();
      
      // Check if agent already has an active call (409 Conflict)
      if (response.status === 409) {
        console.warn('⚠️ Agent already has an active call:', result);
        setCallStatus('failed');
        
        const activeCallInfo = result.activeCall 
          ? `\n\nActive call: ${result.activeCall.phoneNumber}\nDuration: ${Math.floor(result.activeCall.duration / 60)}m ${result.activeCall.duration % 60}s`
          : '';
        
        alert(`❌ Cannot start new call\n\n${result.message || 'You already have an active call'}${activeCallInfo}\n\nPlease end your current call first.`);
        
        setLastCallResult({
          success: false,
          error: result.error || 'Active call in progress',
          activeCall: result.activeCall
        });
        
        setIsLoading(false);
        return;
      }
      
      if (result.success) {
        console.log('✅ Call initiated:', result);
        console.log('🔍 DEBUG: Backend returned conferenceId:', result.conferenceId);
        console.log('🔍 DEBUG: Backend returned callSid:', result.callSid);
        
        setCallStatus('queued');
        setLastCallResult({
          success: true,
          callSid: result.callSid,
          conferenceId: result.conferenceId,
          status: result.status,
          message: result.message
        });
        
        console.log('🔍 DEBUG: About to set activeRestApiCall with:', {
          callSid: result.callSid,
          conferenceId: result.conferenceId,
          startTime: new Date()
        });

        const newActive = {
          callSid: result.callSid,
          conferenceId: result.conferenceId,
          startTime: new Date(),
        };
        setActiveRestApiCall(newActive);
        // 🛡️ Also update the ref synchronously, so the Twilio Device
        // 'incoming' event for this same outbound call (which can fire
        // milliseconds after this state update is enqueued) reads the new
        // value rather than the previous-call/null value still in state.
        activeRestApiCallRef.current = newActive;
        // 🛡️ Reset the disposition-dedup gate for the new call's SID. If
        // the previous call's gate was somehow still set (e.g. agent
        // dismissed but didn't disposition), the new SID is different so the
        // gate would not match, but resetting here makes the intent explicit.
        dispositionShownForCallRef.current = null;

        // Start polling Twilio call status so the UI updates in real-time
        // The Twilio Device incoming handler will handle the WebRTC audio automatically —
        // NO separate joinAgentToConference call needed (that was causing double-connection).
        startCallStatusPolling(result.callSid);
        
        onCallInitiated?.(result);
      } else {
        setCallStatus('failed');
        throw new Error(result.error || 'Failed to make call');
      }
      
    } catch (error: any) {
      console.error('❌ Error making REST API call:', error);
      setCallStatus('failed');
      setLastCallResult({ 
        success: false, 
        error: error.message || 'Failed to make call'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Poll Twilio call status every 1.5 seconds so the UI reflects the real call state.
   * Stops automatically when the call reaches a terminal state.
   */
  const startCallStatusPolling = (callSid: string) => {
    // Clear any existing poll
    if (callStatusIntervalRef.current) {
      clearInterval(callStatusIntervalRef.current);
    }

    const TERMINAL_STATES = ['completed', 'busy', 'no-answer', 'canceled', 'failed'];

    const poll = async () => {
      try {
        const res = await fetch(`/api/calls/${callSid}/live-status`, {
          headers: { 'Authorization': `Bearer ${authBearer()}` }
        });
        const data = await res.json();

        if (data.success && data.status) {
          console.log(`📡 Call status: ${data.status}`);
          setCallStatus(data.status as any);

          if (TERMINAL_STATES.includes(data.status)) {
            stopCallStatusPolling();

            // 🛡️ The Twilio Device 'disconnect' event SHOULD fire when the
            // customer hangs up, but it doesn't always — particularly when
            // the agent's WebRTC audio track is dropped first by network
            // conditions, or when the customer hangs up during the
            // "ringing" phase before the agent leg connects. The previous
            // code just stopped the poll and left the call "active" in the
            // UI forever.
            //
            // Now: when the poll sees a terminal state and we still think
            // we have an active call, force the disposition modal open and
            // tear down state. The dispositionShownForCallRef gate will
            // dedupe with any concurrent 'disconnect' handler.
            const activeRestNow = activeRestApiCallRef.current;
            if (activeRestNow?.callSid === callSid) {
              const duration = Math.floor(
                (Date.now() - activeRestNow.startTime.getTime()) / 1000,
              );
              console.log(
                `📡 Poll detected terminal state '${data.status}' for ${callSid} — forcing disposition`,
              );

              // Tear down the WebRTC leg if it's still around.
              if (currentCallRef.current) {
                try { currentCallRef.current.disconnect(); } catch {}
                setCurrentCall(null);
                currentCallRef.current = null;
              }

              await endCallViaBackend(callSid, 'customer-hangup');
              showDispositionForCall(callSid, duration, activeRestNow.conferenceId);

              setActiveRestApiCall(null);
              activeRestApiCallRef.current = null;
              dispatch(endCall());
            }
          }
        }
      } catch (err) {
        // Network blip — keep polling, don't kill the interval
        console.warn('⚠️ Status poll failed (will retry):', err);
      }
    };

    callStatusIntervalRef.current = setInterval(poll, 1500);
    // Run once immediately so there's no 1.5s gap at the start
    poll();
  };

  const stopCallStatusPolling = () => {
    if (callStatusIntervalRef.current) {
      clearInterval(callStatusIntervalRef.current);
      callStatusIntervalRef.current = null;
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

      // Capture callSid from state before setting up handlers (state might be cleared)
      const callSid = activeRestApiCall?.callSid || '';
      
      // Make WebRTC call to join conference
      const call = await device.connect({
        params: {
          conference: conferenceId,
          agentId: agentId // Pass agent ID to associate call with correct agent
        }
      });

      console.log('✅ Agent joined conference successfully');
      setCurrentCall(call);

      // Set up call event handlers
      call.on('accept', () => {
        console.log('✅ Agent conference call accepted - two way audio active');
        
        // Update Redux state with conferenceId for duplicate prevention
        // IMPORTANT: Use conferenceId from function parameter (closure), not state which might be null
        dispatch(startCall({
          phoneNumber: phoneNumber,
          callSid: callSid, // Captured before handler
          conferenceId: conferenceId, // CRITICAL: From parameter, not state - ensures it's never null
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
        currentCallRef.current = null;
        setActiveRestApiCall(null);
        activeRestApiCallRef.current = null;
        dispatch(endCall());
      });
      
    } catch (error: any) {
      console.error('❌ Error joining conference:', error);
      alert(`Failed to join conference: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleHangup = async () => {
    stopCallStatusPolling();
    setCallStatus('completed');

    const activeRestNow = activeRestApiCallRef.current || activeRestApiCall;

    if (activeRestNow) {
      try {
        setIsLoading(true);
        const callDuration = Math.floor(
          (new Date().getTime() - activeRestNow.startTime.getTime()) / 1000,
        );

        console.log('📞 Agent ending call — disconnecting WebRTC + showing disposition modal');

        if (currentCallRef.current) {
          try {
            currentCallRef.current.disconnect();
          } catch {
            // ignore — Twilio SDK may already be disconnecting
          }
          setCurrentCall(null);
          currentCallRef.current = null;
        }

        await endCallViaBackend(activeRestNow.callSid, 'agent-hangup');
        showDispositionForCall(
          activeRestNow.callSid,
          callDuration,
          activeRestNow.conferenceId,
        );

        setActiveRestApiCall(null);
        activeRestApiCallRef.current = null;
        dispatch(endCall());
      } catch (error: any) {
        console.error('❌ Error preparing call end:', error);
        setLastCallResult({
          success: false,
          message: 'Failed to prepare call end: ' + error.message,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('📞 No active REST API call to end');
      setLastCallResult({
        success: true,
        message: 'No active call to end',
      });
      if (currentCallRef.current) {
        try { currentCallRef.current.disconnect(); } catch {}
        setCurrentCall(null);
        currentCallRef.current = null;
        dispatch(endCall());
      }
    }
  };

  const dialPadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  const sendDtmfDigit = (digit: string) => {
    const call = currentCallRef.current;
    if (!call) {
      console.warn('DTMF: no active WebRTC call');
      return;
    }
    try {
      if (typeof call.sendDigits === 'function') {
        call.sendDigits(digit);
        setLastDtmfSent(digit);
        setTimeout(() => setLastDtmfSent(null), 600);
      } else {
        console.warn('DTMF: sendDigits not available on this call object');
      }
    } catch (e) {
      console.error('DTMF send failed:', e);
    }
  };

  const dispositionModal =
    showDispositionModal && pendingCallEnd ? (
      <DispositionCard
        isOpen={showDispositionModal}
        onSave={handleDispositionSubmit}
        onClose={() => {
          // Clear Redux state when modal is closed without saving
          dispatch(endCall());
          dispatch(clearCall());
          setShowDispositionModal(false);
          setPendingCallEnd(null);
          setActiveRestApiCall(null);
          activeRestApiCallRef.current = null;
          // Allow the next call's disposition modal to show.
          dispositionShownForCallRef.current = null;
        }}
        customerInfo={{
          name: phoneNumber || 'Unknown',
          phoneNumber: phoneNumber || 'Unknown',
        }}
        callDuration={pendingCallEnd.duration}
      />
    ) : null;

  const inCallDtmfKeypad =
    currentCall ? (
      <>
        {!inCallKeypadOpen && (
          <button
            type="button"
            onClick={() => setInCallKeypadOpen(true)}
            className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg ring-2 ring-white/20 hover:bg-slate-700 md:bottom-8 md:right-8"
            title="Open keypad (DTMF)"
            aria-label="Open in-call keypad"
          >
            <span className="text-lg font-mono font-semibold">#</span>
          </button>
        )}
        {inCallKeypadOpen && (
          <div
            className="fixed inset-x-0 bottom-0 z-[110] flex justify-center p-4 pb-6 md:inset-auto md:bottom-8 md:right-8 md:left-auto md:p-0"
            role="dialog"
            aria-label="In-call keypad"
          >
            <div className="w-full max-w-sm rounded-t-2xl bg-white shadow-2xl ring-1 ring-gray-200 md:rounded-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">Keypad</span>
                <button
                  type="button"
                  onClick={() => setInCallKeypadOpen(false)}
                  className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
              <p className="px-4 pb-2 text-xs text-gray-500">
                Sends DTMF tones on the active call (e.g. IVR menus). Use # and * as needed.
              </p>
              {lastDtmfSent && (
                <p className="px-4 pb-1 text-center text-sm font-mono text-blue-600">Sent: {lastDtmfSent}</p>
              )}
              <div className="grid grid-cols-3 gap-2 p-4 pt-0">
                {dialPadNumbers.flat().map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => sendDtmfDigit(d)}
                    className="h-14 rounded-xl border border-gray-200 bg-gray-50 text-xl font-semibold text-gray-900 hover:bg-gray-100 active:bg-gray-200"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    ) : null;

  // Hide dialer chrome when Work page shows active call UI, but keep Device + DTMF + disposition
  if (activeCall.isActive) {
    return (
      <>
        <div className="hidden">
          {/* RestApiDialer Device is running in background for incoming calls */}
        </div>
        {inCallDtmfKeypad}
        {dispositionModal}
      </>
    );
  }

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Device Connection Status Banner */}
      {!isDeviceReady && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-sm">
            <svg className="animate-spin h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-yellow-800 font-medium">Connecting to Twilio...</span>
            <span className="text-yellow-600">Please wait before making calls</span>
          </div>
        </div>
      )}
      
      {isDeviceReady && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-sm">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 font-medium">Ready to make calls</span>
            <span className="text-green-600">Twilio connection established</span>
          </div>
        </div>
      )}
      
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
            disabled={!phoneNumber || isLoading || !isDeviceReady}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            title={!isDeviceReady ? 'Waiting for Twilio connection...' : 'Call customer'}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Making Call...
              </span>
            ) : !isDeviceReady ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
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

        {/* Live Call Status Banner */}
        {callStatus !== 'idle' && (
          (() => {
            const statusConfig: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
              initiating:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   icon: '⏳', label: 'Initiating call…' },
              queued:       { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   icon: '📡', label: 'Connecting to network…' },
              ringing:      { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', icon: '🔔', label: 'Ringing…' },
              'in-progress':{ bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  icon: '🟢', label: 'Call connected' },
              completed:    { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   icon: '✅', label: 'Call ended' },
              busy:         { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: '🔴', label: 'Line busy' },
              'no-answer':  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: '📵', label: 'No answer' },
              canceled:     { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   icon: '✕',  label: 'Call cancelled' },
              failed:       { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: '❌', label: lastCallResult?.error || 'Call failed' },
            };
            const cfg = statusConfig[callStatus] ?? statusConfig['initiating'];
            return (
              <div className={`p-3 rounded-md text-sm border ${cfg.bg} ${cfg.border} ${cfg.text} flex items-center gap-2`}>
                <span className="text-base">{cfg.icon}</span>
                <span className="font-medium">{cfg.label}</span>
                {['initiating', 'queued', 'ringing'].includes(callStatus) && (
                  <span className="ml-auto inline-flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            );
          })()
        )}

        </div>
      )}

    </div>
    {inCallDtmfKeypad}
    {dispositionModal}
    </>
  );
};