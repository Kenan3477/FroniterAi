'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLogin?: string;
  createdAt?: string;
}

interface Campaign {
  campaignId: string;
  name: string;
  status: string;
  dialMethod: string;
}

interface AuthContextType {
  user: User | null;
  currentCampaign: Campaign | null;
  availableCampaigns: Campaign[];
  isInQueue: boolean;
  queueStatus: any | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  joinCampaignQueue: (campaign: Campaign) => Promise<{ success: boolean; message: string }>;
  leaveCampaignQueue: () => Promise<{ success: boolean; message: string }>;
  refreshCampaigns: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuth();
  }, []);

  // Load campaign data when user changes
  useEffect(() => {
    if (user) {
      refreshCampaigns();
    } else {
      setCurrentCampaign(null);
      setAvailableCampaigns([]);
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCampaigns = async () => {
    try {
      if (!user) return;
      
      const response = await fetch('/api/campaigns/user-campaigns', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableCampaigns(data.campaigns || []);
        
        // Auto-select first campaign if none selected and campaigns available
        if (!currentCampaign && data.campaigns && data.campaigns.length > 0) {
          setCurrentCampaign(data.campaigns[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const joinCampaignQueue = async (campaign: Campaign) => {
    try {
      if (!user) {
        return { success: false, message: 'User not authenticated' };
      }

      console.log(`🚀 Joining campaign queue: ${campaign.name}`);

      const response = await fetch('/api/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          campaignId: campaign.campaignId, 
          userId: user.username || user.id 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCampaign(campaign);
        setIsInQueue(true);
        setQueueStatus(data.assignment);
        console.log(`✅ Successfully joined campaign: ${campaign.name}`);
        return { success: true, message: data.message };
      } else {
        console.log(`❌ Failed to join campaign: ${data.error}`);
        return { success: false, message: data.error };
      }
    } catch (error) {
      console.error('Error joining campaign queue:', error);
      return { success: false, message: 'Failed to join campaign queue' };
    }
  };

  const leaveCampaignQueue = async () => {
    try {
      if (!user || !currentCampaign) {
        return { success: false, message: 'No active campaign to leave' };
      }

      console.log(`🚪 Leaving campaign queue: ${currentCampaign.name}`);

      const response = await fetch('/api/queue/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          campaignId: currentCampaign.campaignId, 
          userId: user.username || user.id 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsInQueue(false);
        setQueueStatus(null);
        console.log(`✅ Successfully left campaign queue`);
        return { success: true, message: data.message };
      } else {
        console.log(`❌ Failed to leave campaign: ${data.error}`);
        return { success: false, message: data.error };
      }
    } catch (error) {
      console.error('Error leaving campaign queue:', error);
      return { success: false, message: 'Failed to leave campaign queue' };
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Attempting login for:', username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      console.log('📡 AuthContext: Login response status:', response.status);
      const data = await response.json();
      console.log('📦 AuthContext: Login response data:', data);

      if (data.success) {
        console.log('✅ AuthContext: Login successful, setting user:', data.user);
        setUser(data.user);
        router.push('/dashboard');
        return { success: true, message: data.message };
      } else {
        console.log('❌ AuthContext: Login failed:', data.message);
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  };

  const logout = async () => {
    try {
      console.log('🔓 Starting logout process...');
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      console.log('📤 Logout API response:', data);
      
      if (!response.ok && response.status !== 200) {
        console.warn('⚠️ Logout API returned non-200 status, but proceeding with logout');
      }
      
    } catch (error) {
      console.error('❌ Logout API error (proceeding anyway):', error);
      // Continue with logout even if API call fails
    } finally {
      console.log('🧹 Clearing user session data...');
      
      // Always clear client-side state regardless of API response
      setUser(null);
      setCurrentCampaign(null);
      setAvailableCampaigns([]);
      
      console.log('↩️ Redirecting to login page...');
      router.push('/login');
      
      console.log('✅ Logout process completed');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      currentCampaign, 
      availableCampaigns,
      isInQueue,
      queueStatus,
      login, 
      logout, 
      setCurrentCampaign,
      joinCampaignQueue,
      leaveCampaignQueue,
      refreshCampaigns,
      loading, 
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}