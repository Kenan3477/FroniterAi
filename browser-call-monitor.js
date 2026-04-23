/**
 * Frontend Performance Monitor
 * Paste this into your browser console on the Omnivox frontend
 * Monitors API calls, timing, and errors in real-time
 */

(function() {
  console.clear();
  console.log('%c🚀 OMNIVOX CALL MONITOR STARTED', 'color: #00ff00; font-size: 16px; font-weight: bold;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
  console.log('%cMonitoring all API calls, timing, and errors', 'color: #888;');
  console.log('%cPress Ctrl+C or close console to stop', 'color: #888;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color: #00ff00;');

  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest.prototype.open;
  
  let callStartTime = null;
  let callState = 'idle';

  // Monitor fetch calls
  window.fetch = async function(...args) {
    const url = args[0];
    const startTime = performance.now();
    
    console.log(`%c➡️  [${new Date().toLocaleTimeString()}] API Call Started`, 'color: #4a9eff; font-weight: bold;');
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${args[1]?.method || 'GET'}`);
    
    try {
      const response = await originalFetch.apply(this, args);
      const duration = (performance.now() - startTime).toFixed(2);
      
      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      let responseData;
      
      try {
        responseData = await clonedResponse.json();
      } catch (e) {
        responseData = await clonedResponse.text();
      }
      
      // Log response
      if (response.ok) {
        console.log(`%c✅ [${new Date().toLocaleTimeString()}] API Call Success (${duration}ms)`, 'color: #00ff00; font-weight: bold;');
        console.log(`   Status: ${response.status}`);
        console.log(`   Duration: ${duration}ms`);
        
        // Detect call-related endpoints
        if (url.includes('/api/calls/rest-api') || url.includes('/calls/make')) {
          console.log(`%c📞 CALL INITIATED!`, 'color: #ff00ff; font-weight: bold; font-size: 14px;');
          console.log(`   Response:`, responseData);
          callStartTime = Date.now();
          callState = 'calling';
        } else if (url.includes('/end-call') || url.includes('/endCall')) {
          const callDuration = callStartTime ? ((Date.now() - callStartTime) / 1000).toFixed(2) : 'unknown';
          console.log(`%c📴 CALL ENDED! Duration: ${callDuration}s`, 'color: #ff9900; font-weight: bold; font-size: 14px;');
          console.log(`   Response:`, responseData);
          callStartTime = null;
          callState = 'idle';
        } else if (url.includes('/disposition')) {
          console.log(`%c📝 DISPOSITION SUBMITTED`, 'color: #9900ff; font-weight: bold;');
          console.log(`   Data:`, responseData);
        }
        
        // Performance warnings
        if (duration > 1000) {
          console.warn(`⚠️  SLOW API CALL: ${duration}ms (threshold: 1000ms)`);
        }
        if (duration > 3000) {
          console.error(`❌ VERY SLOW API CALL: ${duration}ms (threshold: 3000ms)`);
        }
        
      } else {
        console.error(`%c❌ [${new Date().toLocaleTimeString()}] API Call Failed (${duration}ms)`, 'color: #ff0000; font-weight: bold;');
        console.error(`   Status: ${response.status} ${response.statusText}`);
        console.error(`   Duration: ${duration}ms`);
        console.error(`   Response:`, responseData);
        
        // Alert on critical call failures
        if (url.includes('/calls/') || url.includes('/api/calls')) {
          console.error(`%c🚨 CALL API FAILED!`, 'color: #ff0000; font-weight: bold; font-size: 16px;');
          console.error(`   This will prevent calls from working!`);
        }
      }
      
      console.log(''); // Empty line for readability
      return response;
      
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error(`%c❌ [${new Date().toLocaleTimeString()}] API Call Error (${duration}ms)`, 'color: #ff0000; font-weight: bold;');
      console.error(`   Error: ${error.message}`);
      console.error(`   URL: ${url}`);
      console.error(`   Duration: ${duration}ms`);
      console.log('');
      throw error;
    }
  };

  // Monitor console errors
  const originalError = console.error;
  console.error = function(...args) {
    const timestamp = new Date().toLocaleTimeString();
    originalError.apply(console, [`%c🚨 [${timestamp}] ERROR DETECTED:`, 'color: #ff0000; font-weight: bold;', ...args]);
  };

  // Monitor console warnings
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const timestamp = new Date().toLocaleTimeString();
    originalWarn.apply(console, [`%c⚠️  [${timestamp}] WARNING:`, 'color: #ff9900; font-weight: bold;', ...args]);
  };

  // Monitor page performance
  if (window.performance) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          console.log(`%c🏁 Page Load Performance:`, 'color: #00ffff; font-weight: bold;');
          console.log(`   DOM Content Loaded: ${entry.domContentLoadedEventEnd.toFixed(2)}ms`);
          console.log(`   Full Load: ${entry.loadEventEnd.toFixed(2)}ms`);
        }
        
        if (entry.entryType === 'resource' && entry.duration > 1000) {
          console.warn(`⚠️  Slow Resource Load: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }

  // Track WebRTC for call audio
  if (window.RTCPeerConnection) {
    const originalRTC = window.RTCPeerConnection;
    window.RTCPeerConnection = function(...args) {
      const pc = new originalRTC(...args);
      
      console.log(`%c🎙️  WebRTC Connection Created`, 'color: #00ffff; font-weight: bold;');
      
      pc.addEventListener('connectionstatechange', () => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`%c🔊 [${timestamp}] WebRTC State: ${pc.connectionState}`, 'color: #00ffff;');
        
        if (pc.connectionState === 'connected') {
          console.log(`%c✅ Call audio connected successfully!`, 'color: #00ff00; font-weight: bold;');
        } else if (pc.connectionState === 'failed') {
          console.error(`%c❌ Call audio connection FAILED!`, 'color: #ff0000; font-weight: bold;');
        } else if (pc.connectionState === 'disconnected') {
          console.log(`%c📴 Call audio disconnected`, 'color: #ff9900; font-weight: bold;');
        }
      });
      
      return pc;
    };
  }

  // Monitor call state changes
  setInterval(() => {
    if (callState === 'calling' && callStartTime) {
      const duration = ((Date.now() - callStartTime) / 1000).toFixed(0);
      console.log(`%c⏱️  Call in progress: ${duration}s`, 'color: #888;');
    }
  }, 10000); // Log every 10 seconds

  console.log('%c✅ Monitor is active! Make your call now.', 'color: #00ff00; font-weight: bold; font-size: 14px;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color: #00ff00;');
})();
