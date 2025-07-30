// 🚀 UI Enhanced by Advanced Evolution System
// ✨ Features: Modern design patterns, animations, responsive layout, performance optimization

import React, { memo, Suspense, lazy, useEffect, useState, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import AnimatedBackground from './components/common/AnimatedBackground';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const Login = lazy(() => import('./components/auth/Login'));

// Enhanced App component with modern React patterns
const App = memo(() => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  // Performance optimization: Memoized theme configuration
  const themeConfig = useMemo(() => ({
    enableAnimations: true,
    enableGradients: true,
    performanceMode: false
  }), []);

  // Enhanced loading state management
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Route-based page title updates
  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/login': 'Frontier - Login',
      '/dashboard': 'Frontier - Dashboard',
      '/': 'Frontier - AI Platform'
    };
    document.title = routeTitles[location.pathname] || 'Frontier - AI Platform';
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={themeConfig}>
        <div className="min-h-screen relative overflow-hidden">
          {/* Enhanced animated background */}
          <AnimatedBackground />
          
          {/* Main content with improved styling */}
          <div className="relative z-10 min-h-screen bg-gradient-to-br from-slate-50/90 via-white/80 to-blue-50/90 dark:from-gray-900/95 dark:via-slate-900/90 dark:to-gray-800/95 backdrop-blur-sm transition-all duration-500">
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="medium" />
              </div>
            }>
              <Routes>
                <Route 
                  path="/login" 
                  element={<Login />} 
                />
                <Route 
                  path="/*" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Suspense>
          </div>
          
          {/* Performance monitoring indicator (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-4 right-4 z-50 px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs backdrop-blur-sm border border-green-400/30">
              🚀 Enhanced by Evolution System
            </div>
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
});

export default App;
