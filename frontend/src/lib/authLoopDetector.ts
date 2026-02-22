/**
 * Authentication Loop Detection and Recovery Utility
 * Prevents infinite refresh loops from expired tokens
 */

export class AuthLoopDetector {
  private static readonly AUTH_CHECK_KEY = 'auth_check_count';
  private static readonly AUTH_LOOP_THRESHOLD = 3;
  private static readonly AUTH_RECOVERY_KEY = 'auth_recovery_needed';
  
  /**
   * Check if we're in an authentication loop
   */
  static detectLoop(): boolean {
    if (typeof window === 'undefined') return false;
    
    const checkCount = parseInt(localStorage.getItem(this.AUTH_CHECK_KEY) || '0');
    return checkCount >= this.AUTH_LOOP_THRESHOLD;
  }
  
  /**
   * Increment auth check counter
   */
  static incrementCheck(): void {
    if (typeof window === 'undefined') return;
    
    const checkCount = parseInt(localStorage.getItem(this.AUTH_CHECK_KEY) || '0');
    localStorage.setItem(this.AUTH_CHECK_KEY, (checkCount + 1).toString());
    
    if (checkCount >= this.AUTH_LOOP_THRESHOLD) {
      console.warn('🚨 Auth loop detected! Triggering recovery...');
      this.triggerRecovery();
    }
  }
  
  /**
   * Reset auth check counter
   */
  static resetCheck(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.AUTH_CHECK_KEY);
    localStorage.removeItem(this.AUTH_RECOVERY_KEY);
  }
  
  /**
   * Trigger authentication recovery
   */
  static triggerRecovery(): void {
    if (typeof window === 'undefined') return;
    
    console.log('🔧 Triggering authentication recovery...');
    
    // Mark recovery as needed
    localStorage.setItem(this.AUTH_RECOVERY_KEY, 'true');
    
    // Clear all authentication related storage
    this.clearAuthStorage();
    
    // Redirect to recovery page
    window.location.href = '/auth-recovery';
  }
  
  /**
   * Check if recovery is needed
   */
  static needsRecovery(): boolean {
    if (typeof window === 'undefined') return false;
    
    return localStorage.getItem(this.AUTH_RECOVERY_KEY) === 'true';
  }
  
  /**
   * Clear all authentication storage
   */
  static clearAuthStorage(): void {
    if (typeof window === 'undefined') return;
    
    // Clear localStorage
    const keysToRemove = [
      'omnivox_token',
      'authToken',
      'sessionData',
      'omnivox-agent-status',
      'access_token',
      'refresh_token'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies client-side
    document.cookie.split(";").forEach(c => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  }
  
  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true; // Consider invalid tokens as expired
    }
  }
  
  /**
   * Get time until token expires (in seconds)
   */
  static getTimeUntilExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const timeUntilExpiry = (expiryTime - Date.now()) / 1000;
      return Math.max(0, timeUntilExpiry);
    } catch {
      return null;
    }
  }
  
  /**
   * Setup automatic token expiry detection
   */
  static setupExpiryDetection(): () => void {
    if (typeof window === 'undefined') return () => {};
    
    const checkInterval = setInterval(() => {
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
      
      if (token && this.isTokenExpired(token)) {
        console.log('🚨 Token expired, triggering recovery...');
        clearInterval(checkInterval);
        this.triggerRecovery();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }
}

/**
 * React hook for authentication loop detection
 */
export function useAuthLoopDetection() {
  const [needsRecovery, setNeedsRecovery] = React.useState(false);
  
  React.useEffect(() => {
    // Check if recovery is needed on mount
    if (AuthLoopDetector.needsRecovery()) {
      setNeedsRecovery(true);
    }
    
    // Setup automatic expiry detection
    const cleanup = AuthLoopDetector.setupExpiryDetection();
    
    return cleanup;
  }, []);
  
  const triggerRecovery = React.useCallback(() => {
    AuthLoopDetector.triggerRecovery();
    setNeedsRecovery(true);
  }, []);
  
  const resetRecovery = React.useCallback(() => {
    AuthLoopDetector.resetCheck();
    setNeedsRecovery(false);
  }, []);
  
  return { needsRecovery, triggerRecovery, resetRecovery };
}

// Import React for the hook
import React from 'react';