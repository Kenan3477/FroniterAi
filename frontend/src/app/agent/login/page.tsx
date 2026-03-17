'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Loader2, Phone, Shield, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AgentLoginData {
  email: string;
  password: string;
  extension?: string;
}

export default function AgentLogin() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [formData, setFormData] = useState<AgentLoginData>({
    email: '',
    password: '',
    extension: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated as agent
  useEffect(() => {
    if (user && user.role === 'AGENT') {
      router.push('/agent/dashboard');
    }
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // First authenticate with the general auth system
      const authResult = await login(formData.email, formData.password);
      
      if (!authResult.success) {
        setError(authResult.message || 'Authentication failed');
        return;
      }

      // Check if user has agent role after successful login
      if (user?.role !== 'AGENT') {
        setError('Access denied. Agent privileges required.');
        return;
      }

      // Fetch or create agent profile
      const agentResponse = await fetch(`/api/dialler/agents?email=${formData.email}`);
      let agent;

      if (!agentResponse.ok) {
        // Create agent profile if it doesn't exist
        const createResponse = await fetch('/api/dialler/agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            firstName: user?.firstName || 'Agent',
            lastName: user?.lastName || 'User',
            extension: formData.extension,
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create agent profile');
        }

        agent = await createResponse.json();
      } else {
        const agents = await agentResponse.json();
        agent = agents.find((a: any) => a.email === formData.email);
        
        if (!agent) {
          throw new Error('Agent profile not found');
        }
      }

      // Store agent data in session storage for the agent interface
      sessionStorage.setItem('agentData', JSON.stringify({
        ...agent,
        sessionId: Date.now().toString(),
        loginTime: new Date().toISOString(),
      }));

      // Redirect to agent dashboard
      router.push('/agent/dashboard');

    } catch (err: any) {
      console.error('Agent login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur">
          <div className="text-center pb-6 p-6 border-b">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Phone className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Kennex Agent Portal
            </h2>
            <p className="text-gray-600">
              Sign in to access your agent dashboard
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <Shield className="h-4 w-4" />
                  <div>{error}</div>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="agent@company.com"
                    className="pl-10 h-11"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="pl-10 h-11"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extension" className="text-sm font-medium text-gray-700">
                  Extension (Optional)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="extension"
                    name="extension"
                    type="text"
                    value={formData.extension}
                    onChange={handleInputChange}
                    placeholder="1001"
                    className="pl-10 h-11"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In to Agent Portal'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need help?{' '}
                <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Kennex Dialling System v1.0 - Secure Agent Access
          </p>
        </div>
      </div>
    </div>
  );
}