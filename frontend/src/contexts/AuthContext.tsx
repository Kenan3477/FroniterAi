'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export interface Campaign {
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
  agentStatus: string;
  isUpdatingStatus: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  joinCampaignQueue: (campaign: Campaign) => Promise<{ success: boolean; message: string }>;
  leaveCampaignQueue: () => Promise<{ success: boolean; message: string }>;
  refreshCampaigns: () => Promise<void>;
  updateAgentStatus: (status: string) => Promise<{ success: boolean; message?: string }>;
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
  const [agentStatus, setAgentStatus] = useState<string>('Away');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  const refreshCampaigns = useCallback(async () => {
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
                console.log(`  - name: "${campaign.name}"`);
                console.log(`  - status === 'Active': ${campaign.status === 'Active'}`);
                console.log(`  - isActive === true: ${campaign.isActive === true}`);
                console.log(`  - name starts with [DELETED]: ${campaign.name?.startsWith('[DELETED]')}`);
                
                // Filter out deleted campaigns and require either Active status OR isActive
                const isDeleted = campaign.name?.startsWith('[DELETED]');
                const isActive = campaign.status === 'Active' || campaign.isActive === true;
                const passes = !isDeleted && isActive;
                
                console.log(`🔍 Campaign ${campaign.campaignId}: status=${campaign.status}, isActive=${campaign.isActive}, deleted=${isDeleted}, passes filter=${passes}`);
                return passes;
              })
              .map((campaign: any) => ({
                campaignId: campaign.campaignId,
                name: campaign.name,
                displayName: campaign.name,
                type: 'OUTBOUND',
                dialMethod: campaign.dialMethod || 'MANUAL_DIAL', // Use actual dialMethod from campaign data
                status: campaign.status
              }));
          }

          console.log('✅ Active user-assigned campaigns:', activeCampaigns);
          setAvailableCampaigns(activeCampaigns);
          
          // Auto-select first available campaign if none selected
          setCurrentCampaign(prevCampaign => {
            if (!prevCampaign && activeCampaigns.length > 0) {
              console.log('🔄 Auto-selecting first available campaign:', activeCampaigns[0].name);
              return activeCampaigns[0];
            }
            
            // Check if current campaign is still valid
            if (prevCampaign) {
              const stillValid = activeCampaigns.find(c => c.campaignId === prevCampaign.campaignId);
              if (!stillValid && activeCampaigns.length > 0) {
                console.log('🔄 Current campaign no longer available, switching to first available');
                return activeCampaigns[0];
              } else if (!stillValid) {
                return null;
              }
            }
            
            return prevCampaign;
          });
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
  }, [user?.id, user?.role]); // Remove currentCampaign to prevent infinite loop

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
  }, [user?.id, user?.role]); // Use specific user properties instead of refreshCampaigns

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          
          // Restore agent status from localStorage
          const savedStatus = localStorage.getItem('omnivox-agent-status');
          if (savedStatus && ['Available', 'Away', 'Break', 'Training'].includes(savedStatus)) {
            setAgentStatus(savedStatus);
            console.log('🔄 Restored agent status from localStorage:', savedStatus);
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
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

  const updateAgentStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    console.log(`🔄 AuthContext: Updating agent status to: ${newStatus}`);
    
    try {
      // Smart campaign selection logic
      let campaignToUse = currentCampaign;
      
      if (!campaignToUse && availableCampaigns.length > 0) {
        // Auto-select first available campaign
        campaignToUse = availableCampaigns[0];
        setCurrentCampaign(campaignToUse);
        console.log('🔄 Auto-selected campaign:', campaignToUse.name);
      }
      
      if (!campaignToUse) {
        setIsUpdatingStatus(false);
        return { success: false, message: 'No campaigns available. Please ensure you are assigned to at least one active campaign.' };
      }

      // Update agent status and trigger auto-dial if Available
      const response = await fetch('/api/agent/status-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agentId: user?.id?.toString() || user?.username || 'agent-1',
          status: newStatus,
          campaignId: campaignToUse.campaignId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAgentStatus(newStatus);
        
        // Store in localStorage for cross-tab persistence
        localStorage.setItem('omnivox-agent-status', newStatus);
        
        console.log(`✅ AuthContext: Agent status updated to: ${newStatus}`);
        return { success: true };
      } else {
        console.error('Failed to update status:', data.error);
        return { success: false, message: data.error };
      }
    } catch (error) {
      console.error('Status update error:', error);
      return { success: false, message: 'Failed to update agent status' };
    } finally {
      setIsUpdatingStatus(false);
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
      
      // Clear all client-side storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear AuthContext state
      setUser(null);
      setCurrentCampaign(null);
      setAvailableCampaigns([]);
      setAgentStatus('Away');
      setIsInQueue(false);
      setQueueStatus(null);
      
      // Force a hard redirect to prevent back button issues
      console.log('↩️ Performing hard redirect to login page...');
      window.location.replace('/login');
      
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
      agentStatus,
      isUpdatingStatus,
      login, 
      logout, 
      setCurrentCampaign,
      joinCampaignQueue,
      leaveCampaignQueue,
      refreshCampaigns,
      updateAgentStatus,
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