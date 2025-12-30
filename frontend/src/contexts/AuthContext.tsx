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
      if (!user?.id) {
        console.log('❌ No user ID available for campaign fetch');
        setAvailableCampaigns([]);
        return;
      }

      console.log('🔍 Fetching user-assigned campaigns...');
      
      // Use different endpoints based on user role
      let apiUrl: string;
      if (user.role === 'ADMIN') {
        // Admin can use the admin endpoint to view their own campaigns
        apiUrl = `/api/admin/users/${user.id}/campaigns`;
      } else {
        // Regular users use the Next.js proxy to backend endpoint
        apiUrl = '/api/campaigns/my-campaigns';
      }

      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 User campaign response:', data);
        
        if (data.success) {
          let activeCampaigns: any[] = [];

          if (user.role === 'ADMIN' && data.data?.assignments) {
            // Handle admin endpoint response format
            activeCampaigns = data.data.assignments
              .filter((assignment: any) => assignment.campaignStatus === 'Active')
              .map((assignment: any) => ({
                campaignId: assignment.campaignId,
                name: assignment.campaignName,
                displayName: assignment.campaignName,
                type: 'OUTBOUND',
                dialMethod: assignment.dialMethod || 'MANUAL_DIAL',
                status: assignment.campaignStatus
              }));
          } else if (data.data && Array.isArray(data.data)) {
            // Handle user endpoint response format
            console.log('🔍 Processing user campaigns:', data.data.length, 'total campaigns');
            console.log('🔍 All campaigns:', data.data.map((c: any) => ({ id: c.campaignId, name: c.name, status: c.status, isActive: c.isActive })));
            
            activeCampaigns = data.data
              .filter((campaign: any) => {
                console.log(`🔍 Campaign ${campaign.campaignId} detailed check:`);
                console.log(`  - status: "${campaign.status}" (type: ${typeof campaign.status})`);
                console.log(`  - isActive: ${campaign.isActive} (type: ${typeof campaign.isActive})`);
                console.log(`  - status === 'Active': ${campaign.status === 'Active'}`);
                console.log(`  - isActive === true: ${campaign.isActive === true}`);
                
                const isActive = campaign.status === 'Active' && campaign.isActive;
                console.log(`🔍 Campaign ${campaign.campaignId}: status=${campaign.status}, isActive=${campaign.isActive}, passes filter=${isActive}`);
                return isActive;
              })
              .map((campaign: any) => ({
                campaignId: campaign.campaignId,
                name: campaign.name,
                displayName: campaign.name,
                type: 'OUTBOUND',
                dialMethod: 'MANUAL_DIAL', // Default for now
                status: campaign.status
              }));
          }

          console.log('✅ Active user-assigned campaigns:', activeCampaigns);
          setAvailableCampaigns(activeCampaigns);
          
          // Auto-select current campaign if user has assignments
          if (activeCampaigns.length > 0) {
            // If no current campaign is selected, auto-select the first one
            if (!currentCampaign) {
              console.log('🔄 Auto-selecting first available campaign:', activeCampaigns[0].name);
              setCurrentCampaign(activeCampaigns[0]);
            } else {
              // Check if current campaign is still valid
              const stillValid = activeCampaigns.find(c => c.campaignId === currentCampaign.campaignId);
              if (!stillValid) {
                console.log('🔄 Current campaign no longer available, switching to first available');
                setCurrentCampaign(activeCampaigns[0]);
              }
            }
          } else {
            // No campaigns available, clear current campaign
            setCurrentCampaign(null);
          }
        } else {
          console.log('📭 No campaign assignments found');
          setAvailableCampaigns([]);
          setCurrentCampaign(null);
        }
      } else {
        console.error('❌ Failed to fetch user campaigns:', response.status);
        setAvailableCampaigns([]);
        setCurrentCampaign(null);
      }
    } catch (error) {
      console.error('❌ Error fetching user campaigns:', error);
      setAvailableCampaigns([]);
      setCurrentCampaign(null);
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