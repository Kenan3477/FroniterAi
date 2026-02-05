'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';

export default function FlowExecutionTestPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [executionId, setExecutionId] = useState('');

  // Test data from our Flash Inbound flow
  const testFlowData = {
    flowId: 'flash_inbound_flow',
    cli: '+441234567890',
    callerId: 'Test Caller'
  };

  const startFlowExecution = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/flow-execution/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testFlowData)
      });

      const result = await response.json();
      setTestResult(result);
      
      if (result.executionId) {
        setExecutionId(result.executionId);
      }
    } catch (error) {
      console.error('Error starting flow execution:', error);
      setTestResult({ error: 'Failed to start flow execution' });
    } finally {
      setLoading(false);
    }
  };

  const testIVRInput = async (digit: string) => {
    if (!executionId) {
      alert('Please start a flow execution first');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/flow-execution/ivr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          executionId,
          digit
        })
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Error testing IVR input:', error);
      setTestResult({ error: 'Failed to process IVR input' });
    } finally {
      setLoading(false);
    }
  };

  const simulateBusinessHours = async (withinHours: boolean) => {
    setLoading(true);
    try {
      // Adjust the time to simulate business hours or outside hours
      const testTime = withinHours 
        ? new Date().setHours(12, 0, 0) // 12 PM - within hours
        : new Date().setHours(20, 0, 0); // 8 PM - outside hours

      const testData = {
        ...testFlowData,
        context: {
          currentTime: new Date(testTime).toISOString()
        }
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/flow-execution/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      setTestResult(result);
      
      if (result.executionId) {
        setExecutionId(result.executionId);
      }
    } catch (error) {
      console.error('Error testing business hours:', error);
      setTestResult({ error: 'Failed to test business hours' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Flow Execution Test</h1>
          <button 
            onClick={() => { setTestResult(null); setExecutionId(''); }}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Clear Results
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Controls */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Test Controls</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Flow Execution</h3>
                <button
                  onClick={startFlowExecution}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Testing...' : 'Start Flash Inbound Flow'}
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Business Hours Test</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => simulateBusinessHours(true)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Within Hours (12 PM)
                  </button>
                  <button
                    onClick={() => simulateBusinessHours(false)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Outside Hours (8 PM)
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">IVR Test</h3>
                <p className="text-sm text-gray-600">
                  Current Execution ID: {executionId || 'None'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => testIVRInput('1')}
                    disabled={loading || !executionId}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Press 1
                  </button>
                  <button
                    onClick={() => testIVRInput('2')}
                    disabled={loading || !executionId}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Press 2
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Test Flow Data</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                  {JSON.stringify(testFlowData, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Test Results</h2>
            </div>
            <div className="p-6">
              {testResult ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    {testResult.success ? '✅ Success' : '❌ Error'}
                  </h3>
                  <textarea
                    value={JSON.stringify(testResult, null, 2)}
                    readOnly
                    rows={20}
                    className="w-full font-mono text-xs border border-gray-300 rounded-md p-3"
                  />
                </div>
              ) : (
                <p className="text-gray-500">
                  Run a test to see results here...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Flow Visualization */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Flash Inbound Flow Overview</h2>
          </div>
          <div className="p-6">
            <div className="text-sm space-y-3">
              <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <strong>1. Flash Inbound (Event Trigger):</strong> Receives inbound call on CLI
              </div>
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <strong>2. 9-5 (Business Hours Check):</strong> Checks if within 9 AM - 5 PM
              </div>
              <div className="p-3 bg-green-50 border-l-4 border-slate-400 rounded">
                <strong>3a. Within Hours → IVR:</strong> Presents menu with options 1-4
              </div>
              <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                <strong>3b. Outside Hours → Flash OOH:</strong> Plays out-of-hours audio
              </div>
              <div className="p-3 bg-purple-50 border-l-4 border-purple-400 rounded">
                <strong>4a. Option 1 → YourGoTo:</strong> External transfer to DDI
              </div>
              <div className="p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded">
                <strong>4b. Option 2 → Customer Services:</strong> Queue transfer
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}