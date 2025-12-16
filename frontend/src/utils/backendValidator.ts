/**
 * Frontend-Backend Connection Validator
 * Ensures frontend can communicate with backend before app initialization
 */

import React from 'react';

class BackendConnectionValidator {
  private backendUrl: string;
  private retryCount: number = 0;
  private maxRetries: number = 5;
  
  constructor() {
    this.backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  }

  async validateConnection(): Promise<boolean> {
    console.log('🔍 Validating backend connection...');
    
    try {
      const response = await fetch(`${this.backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }
      
      const health = await response.json();
      console.log('✅ Backend connection validated successfully');
      console.log('   Backend URL:', this.backendUrl);
      console.log('   Backend Status:', health.status);
      
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async validateCriticalEndpoints(): Promise<{ [key: string]: boolean }> {
    const endpoints = {
      health: '/health',
      api: '/api',
      systemOverview: '/api/admin/system/overview'
    };
    
    const results: { [key: string]: boolean } = {};
    
    for (const [name, path] of Object.entries(endpoints)) {
      try {
        const response = await fetch(`${this.backendUrl}${path}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        
        results[name] = response.ok;
        console.log(`   ${response.ok ? '✅' : '❌'} ${name}: ${path}`);
      } catch (error) {
        results[name] = false;
        console.log(`   ❌ ${name}: ${path} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return results;
  }

  async ensureBackendReady(): Promise<boolean> {
    const isConnected = await this.validateConnection();
    
    if (!isConnected) {
      console.error('💥 Cannot connect to backend!');
      console.error('🔧 Ensure backend is running: cd backend && npm run dev');
      return false;
    }
    
    console.log('🔗 Testing critical endpoints...');
    const endpointResults = await this.validateCriticalEndpoints();
    
    const allEndpointsHealthy = Object.values(endpointResults).every(status => status);
    
    if (!allEndpointsHealthy) {
      console.warn('⚠️ Some backend endpoints are not responding properly');
      console.warn('🔧 Check backend logs for errors');
    }
    
    return isConnected && allEndpointsHealthy;
  }

  // Helper method for component use
  static async quickHealthCheck(): Promise<boolean> {
    const validator = new BackendConnectionValidator();
    return await validator.validateConnection();
  }
}

export default BackendConnectionValidator;

// Utility function for use in components
export async function ensureBackendConnection(): Promise<boolean> {
  if (typeof window === 'undefined') {
    // Skip validation during SSR
    return true;
  }
  
  const validator = new BackendConnectionValidator();
  return await validator.ensureBackendReady();
}

// Hook for React components
export function useBackendConnection() {
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  
  const checkConnection = React.useCallback(async () => {
    setIsChecking(true);
    try {
      const connected = await BackendConnectionValidator.quickHealthCheck();
      setIsConnected(connected);
    } catch (error) {
      console.error('Backend connection check failed:', error);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  React.useEffect(() => {
    checkConnection();
  }, [checkConnection]);
  
  return { isConnected, isChecking, recheckConnection: checkConnection };
}