'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import OmniCube from '@/components/ui/OmniCube';

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Clear specific field error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate fields
    const newErrors: { username?: string; password?: string } = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Attempting login for:', formData.username);
      const result = await login(formData.username.trim(), formData.password);
      console.log('📝 Login result:', result);
      
      if (!result.success) {
        setErrors({ general: result.message || 'Login failed' });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Starfield Background with Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-purple-950 items-center justify-center p-8 relative overflow-hidden">
        {/* Animated Starfield Background */}
        <div className="absolute inset-0">
          {/* Background gradient that matches the logo */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950 to-purple-950"></div>
          
          {/* Animated stars */}
          {[...Array(150)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                animationDelay: `${Math.random() * 3}s`,
                animation: `twinkle ${2 + Math.random() * 2}s infinite`
              }}
            />
          ))}
          
          {/* Larger glowing stars */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`glow-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                background: `hsl(${180 + Math.random() * 60}, 70%, 70%)`,
                boxShadow: `0 0 ${Math.random() * 10 + 5}px currentColor`,
                animationDelay: `${Math.random() * 4}s`,
                animation: `pulse ${3 + Math.random() * 2}s infinite ease-in-out`
              }}
            />
          ))}
          
          {/* Nebula effects */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 right-1/2 w-32 h-32 bg-cyan-500/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>

        {/* Centered Content Container */}
        <div className="flex flex-col items-center justify-center text-center space-y-8 relative z-10 max-w-lg">
          {/* Animated Matrix Cube - Perfectly Centered */}
          <div className="flex items-center justify-center">
            <OmniCube />
          </div>

          {/* OMNIVOX AI Logo Text with Voice Waves */}
          <div className="space-y-4 text-center">
            <h1 className="text-6xl font-bold text-white tracking-wider relative flex items-center justify-center">
              <span className="relative z-10 bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                OMNI
              </span>
              
              {/* Voice Wave V replacement - Flipped upside down */}
              <div className="relative mx-2 flex items-start justify-center h-16 space-x-1">
                {/* Voice wave bars representing the "V" - now pointing downward */}
                <div className="w-2 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full voice-wave-1"></div>
                <div className="w-2 bg-gradient-to-b from-cyan-300 to-cyan-100 rounded-full voice-wave-2"></div>
                <div className="w-2 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full voice-wave-3"></div>
                <div className="w-2 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full voice-wave-4"></div>
                <div className="w-2 bg-gradient-to-b from-cyan-300 to-cyan-100 rounded-full voice-wave-5"></div>
                <div className="w-2 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full voice-wave-6"></div>
                <div className="w-2 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full voice-wave-7"></div>
              </div>
              
              <span className="relative z-10 bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                OX AI
              </span>
              
              <div className="absolute inset-0 blur-lg bg-gradient-to-r from-cyan-400 to-blue-400 opacity-20 animate-pulse"></div>
            </h1>
            <p className="text-lg text-slate-200 leading-relaxed max-w-md mx-auto opacity-90">
              Advanced conversational AI platform with intelligent workflow automation
            </p>
            
            {/* Powered by Quanterae Solutions */}
            <div className="pt-4">
              <p className="text-sm text-slate-400 font-light">
                Powered by <span className="text-cyan-300 font-medium">Quanterae Solutions</span>
              </p>
            </div>
          </div>
            
          {/* Animated Feature Pills - Centered */}
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { icon: '🤖', text: 'Smart Dialing', delay: '0s' },
              { icon: '📊', text: 'Real-time Analytics', delay: '0.5s' },
              { icon: '🎯', text: 'Campaign Management', delay: '1s' },
            ].map((feature, index) => (
              <span 
                key={index}
                className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full text-white text-sm font-medium border border-cyan-400/20 shadow-lg hover:bg-white/20 hover:border-cyan-400/40 transition-all duration-300"
                style={{
                  animation: `slideUp 0.8s ease-out ${feature.delay}`,
                }}
              >
                <span className="mr-2">{feature.icon}</span>
                {feature.text}
              </span>
            ))}
          </div>
        </div>

        {/* CSS for animations */}
        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes twinkle {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 0.4;
            }
            50% {
              opacity: 0.8;
            }
          }

          .voice-wave-1 {
            height: 60%;
            animation: pulse 1.5s infinite;
            animation-delay: 0s;
          }
          
          .voice-wave-2 {
            height: 40%;
            animation: pulse 1.3s infinite;
            animation-delay: 0.2s;
          }
          
          .voice-wave-3 {
            height: 80%;
            animation: pulse 1.7s infinite;
            animation-delay: 0.4s;
          }
          
          .voice-wave-4 {
            height: 100%;
            animation: pulse 1.4s infinite;
            animation-delay: 0.1s;
          }
          
          .voice-wave-5 {
            height: 70%;
            animation: pulse 1.6s infinite;
            animation-delay: 0.3s;
          }
          
          .voice-wave-6 {
            height: 50%;
            animation: pulse 1.2s infinite;
            animation-delay: 0.5s;
          }
          
          .voice-wave-7 {
            height: 35%;
            animation: pulse 1.8s infinite;
            animation-delay: 0.6s;
          }
        `}</style>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-3xl font-bold text-gray-900">OMNI</span>
                
                {/* Voice Wave V replacement - login form header size */}
                <div className="flex items-start justify-center h-8 space-x-0.5 mx-1">
                  {/* Voice wave bars representing the "V" - pointing downward */}
                  <div className="w-1.5 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full voice-wave-1"></div>
                  <div className="w-1.5 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full voice-wave-2"></div>
                  <div className="w-1.5 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded-full voice-wave-3"></div>
                  <div className="w-1.5 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full voice-wave-4"></div>
                  <div className="w-1.5 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full voice-wave-5"></div>
                  <div className="w-1.5 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded-full voice-wave-6"></div>
                  <div className="w-1.5 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full voice-wave-7"></div>
                </div>
                
                <span className="text-3xl font-bold text-gray-900">OX-AI</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-600">Sign in to your account to continue your work</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            {errors.general && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700 text-sm font-medium">{errors.general}</p>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors ${
                    errors.username ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 font-medium">
                    Remember me
                  </label>
                </div>
                <a href="/forgot-password" className="text-sm text-slate-600 hover:text-slate-500 font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-lg transform hover:scale-[1.02]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-500">
                Powered by <span className="font-semibold text-slate-600">Quanterae Solutions</span> • 2025 • All rights reserved
              </p>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Or scan to access mobile app</p>
            <div className="inline-flex items-center justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-lg border border-gray-300">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-500 font-medium">QR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}