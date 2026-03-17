'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = Date.now().toString();
    return { 
      hasError: true, 
      error, 
      errorId 
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    console.error('🚨 OMNIVOX ERROR BOUNDARY - Detailed Error Report:', errorDetails);
    
    // Store error details in sessionStorage for debugging
    try {
      sessionStorage.setItem(`omnivox_error_${this.state.errorId}`, JSON.stringify(errorDetails));
    } catch (e) {
      console.error('Failed to store error details:', e);
    }
    
    this.setState({ errorInfo: errorDetails });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Something went wrong!
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                An error occurred while loading the application. Please try refreshing the page.
              </p>
              {this.state.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-left">
                  <p className="text-xs text-red-800 font-mono">
                    Error: {this.state.error.message}
                  </p>
                  {this.state.errorId && (
                    <p className="text-xs text-red-600 mt-1">
                      ID: {this.state.errorId}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try again
                </button>
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}