'use client';

import React, { useState } from 'react';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface AgentLoginProps {
  onLogin: (agent: any) => void;
}

const AgentLogin: React.FC<AgentLoginProps> = ({ onLogin }) => {
  const [agentId, setAgentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentId) {
      alert('Please enter your Agent ID');
      return;
    }

    setIsLoggingIn(true);

    try {
      // Get agent data
      const response = await fetch(`/api/agents/status?agentId=${agentId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Update agent to logged in status
        await fetch('/api/agents/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentId,
            status: 'Offline' // Start as offline, agent will go available manually
          })
        });

        onLogin(data.agent);
      } else if (response.status === 404) {
        alert('Agent ID not found. Please check your credentials.');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-kennex-100">
            <UserIcon className="h-8 w-8 text-kennex-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Agent Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your Kennex agent dashboard
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="agentId" className="block text-sm font-medium text-gray-700">
                Agent ID
              </label>
              <div className="mt-1 relative">
                <input
                  id="agentId"
                  name="agentId"
                  type="text"
                  required
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-kennex-500 focus:border-kennex-500"
                  placeholder="Enter your Agent ID"
                />
                <UserIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Example: AGENT001, AGENT002, AGENT003
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-kennex-500 focus:border-kennex-500"
                  placeholder="Enter your password"
                />
                <LockClosedIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Password validation is disabled for demo
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-kennex-600 hover:bg-kennex-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kennex-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Demo Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Instructions</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• Use Agent ID: <strong>AGENT001</strong>, <strong>AGENT002</strong>, or <strong>AGENT003</strong></p>
            <p>• Password can be anything (validation disabled)</p>
            <p>• Once logged in, click "Go Available" to receive calls</p>
            <p>• The system will simulate incoming calls based on dial queue</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentLogin;