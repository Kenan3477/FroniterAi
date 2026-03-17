'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface TokenValidationData {
  email: string;
  name: string;
  organizationName: string;
  tokenValid: boolean;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export default function SetupPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  const [validationData, setValidationData] = useState<TokenValidationData | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (!tokenParam || !emailParam) {
      setError('Invalid setup link. Please check your email for the correct link.');
      setLoading(false);
      return;
    }

    setToken(tokenParam);
    setEmail(emailParam);
    validateToken(tokenParam, emailParam);
  }, [searchParams]);

  const validateToken = async (token: string, email: string) => {
    try {
      const response = await fetch(`/api/auth/validate-setup-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setValidationData(data.data);
      } else {
        setError(data.error || 'Invalid or expired setup link');
      }
    } catch (err) {
      setError('Failed to validate setup link. Please try again.');
      console.error('Token validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    if (/[!@#$%^&*]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character (!@#$%^&*)');
    }

    return {
      score,
      feedback,
      isValid: score === 5
    };
  };

  useEffect(() => {
    if (password) {
      setPasswordStrength(validatePassword(password));
    } else {
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordStrength.isValid) {
      setError('Please ensure your password meets all requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the JWT token
        localStorage.setItem('token', data.data.token);
        
        // Show success and redirect
        alert(`✅ Password setup completed successfully!\n\nWelcome to ${validationData?.organizationName}!\nRedirecting to dashboard...`);
        
        // Redirect to admin dashboard
        router.push('/admin');
      } else {
        setError(data.error || 'Failed to setup password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Password setup error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score < 2) return 'bg-red-500';
    if (score < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score < 2) return 'Weak';
    if (score < 4) return 'Medium';
    return 'Strong';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating setup link...</p>
        </div>
      </div>
    );
  }

  if (error && !validationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">⚠️ Invalid Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Please check your email for the correct setup link or contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">🎯</span>
          </div>
          <CardTitle className="text-2xl">Set Up Your Password</CardTitle>
          <p className="text-gray-600">
            Welcome to <strong>{validationData?.organizationName}</strong>
          </p>
          <p className="text-sm text-gray-500">
            {validationData?.email}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Password strength:</span>
                    <span className={`font-medium ${passwordStrength.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    ></div>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Required:</p>
                      <ul className="text-xs space-y-1">
                        {passwordStrength.feedback.map((item, index) => (
                          <li key={index} className="flex items-center text-red-600">
                            <XCircle className="w-3 h-3 mr-1" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {passwordStrength.isValid && (
                    <div className="mt-2 flex items-center text-green-600 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Password meets all requirements
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <XCircle className="w-3 h-3 mr-1" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && password && (
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Passwords match
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting || !passwordStrength.isValid || password !== confirmPassword}
            >
              {submitting ? 'Setting up password...' : 'Complete Setup'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>This will complete your organization setup and automatically log you in.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}