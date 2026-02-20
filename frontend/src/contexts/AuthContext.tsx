'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Campaign {
  campaignId: string;
  name: string;
  status: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  currentCampaign: Campaign | null;
  availableCampaigns: Campaign[];
  isInQueue: boolean;
  queueStatus: any | null;
  agentStatus: string;
  isUpdatingStatus: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;
  updateAgentStatus: (status: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshCampaigns: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<any | null>(null);
  const [agentStatus, setAgentStatus] = useState('Unavailable');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Session heartbeat to keep track of active sessions
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    if (isAuthenticated && isClient) {
      console.log('💓 Starting session heartbeat...');
      
      // Send heartbeat every 5 minutes to update last activity
      heartbeatInterval = setInterval(async () => {
        try {
          const sessionData = localStorage.getItem('sessionData');
          if (sessionData) {
            const parsedData = JSON.parse(sessionData);
            
            // Update last activity timestamp
            const response = await fetch('/api/session/heartbeat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                sessionId: parsedData.sessionId,
                lastActivity: new Date().toISOString()
              }),
            });
            
            if (response.ok) {
              console.log('💓 Session heartbeat sent successfully');
            }
          }
        } catch (error) {
          console.warn('⚠️ Session heartbeat failed:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (heartbeatInterval) {
        console.log('💔 Stopping session heartbeat...');
        clearInterval(heartbeatInterval);
      }
    };
  }, [isAuthenticated, isClient]);ect, useState, useCallback } from 'react';
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
  const [agentStatus, setAgentStatus] = useState<string>('Unavailable');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false); // Add client-side hydration flag
  const router = useRouter();

  const isAuthenticated = !!user;

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

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
        // Admin users should see all active campaigns, not just assigned ones
        apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/campaign-management/campaigns`;
      } else {
        // Regular users use the Next.js proxy to backend endpoint
        apiUrl = '/api/campaigns/my-campaigns';
      }

      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': isClient ? `Bearer ${localStorage.getItem('omnivox_token') || ''}` : ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 User campaign response:', data);
        
        if (data.success) {
          let activeCampaigns: any[] = [];

          if (user.role === 'ADMIN' && data.data && Array.isArray(data.data) && !data.data.assignments) {
            // Handle admin campaign management API response format (all campaigns)
            console.log('🔍 Processing all campaigns for admin:', data.data.length, 'total campaigns');
            
            activeCampaigns = data.data
              .filter((campaign: any) => {
                // Filter out deleted campaigns using the same logic as DataManagementContent
                const name = campaign.displayName || campaign.name || '';
                const campaignId = campaign.campaignId || '';
                
                const isDeleted = name.toLowerCase().includes('[deleted]') || 
                                name.toLowerCase().includes('deleted') ||
                                campaign.status === 'ARCHIVED' ||
                                campaign.status === 'DELETED';
                
                // Filter out organizational/internal campaigns (case-insensitive)
                const nameLower = name.toLowerCase();
                const campaignIdLower = campaignId.toLowerCase();
                
                const isOrganizationalCampaign = 
                  // Exact campaign ID matches
                  campaignIdLower === 'historical-calls' ||
                  campaignIdLower === 'live-calls' ||
                  campaignIdLower === 'imported-twilio' ||
                  // Name-based filtering (case-insensitive)
                  nameLower.includes('historical calls') ||
                  nameLower.includes('historic calls') ||
                  nameLower.includes('live calls') ||
                  nameLower.includes('imported twilio') ||
                  nameLower.includes('system') ||
                  nameLower.includes('internal') ||
                  // Additional organizational patterns
                  nameLower.startsWith('__') ||
                  nameLower.startsWith('sys_') ||
                  nameLower.startsWith('org_') ||
                  // Filter campaigns that are clearly organizational
                  campaignIdLower.includes('system') ||
                  campaignIdLower.includes('internal') ||
                  campaignIdLower.includes('default') ||
                  campaignIdLower.includes('template');
                
                console.log(`🔍 Campaign ${campaign.campaignId}: name="${name}", status="${campaign.status}", isDeleted=${isDeleted}, isOrganizational=${isOrganizationalCampaign}`);
                return !isDeleted && !isOrganizationalCampaign;
              })
              .map((campaign: any) => ({
                campaignId: campaign.campaignId,
                name: campaign.name,
                displayName: campaign.displayName || campaign.name,
                type: 'OUTBOUND',
                dialMethod: campaign.dialMethod || 'MANUAL_DIAL',
                status: campaign.status
              }));
          } else if (user.role === 'ADMIN' && data.data?.assignments) {
            // Handle admin endpoint response format (user assignments)
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
                
                // Filter out organizational/internal campaigns
                const campaignId = campaign.campaignId || '';
                const name = campaign.name || '';
                const isOrganizationalCampaign = campaignId === 'HISTORICAL-CALLS' ||
                                               campaignId === 'LIVE-CALLS' ||
                                               campaignId === 'IMPORTED-TWILIO' ||
                                               name.includes('Historical Calls') ||
                                               name.includes('Live Calls') ||
                                               name.includes('Imported Twilio');
                
                const passes = !isDeleted && isActive && !isOrganizationalCampaign;
                
                console.log(`🔍 Campaign ${campaign.campaignId}: status=${campaign.status}, isActive=${campaign.isActive}, deleted=${isDeleted}, organizational=${isOrganizationalCampaign}, passes filter=${passes}`);
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

  // Load campaign data when user changes
  useEffect(() => {
    if (user) {
      refreshCampaigns();
    } else {
      setCurrentCampaign(null);
      setAvailableCampaigns([]);
    }
  }, [user?.id, user?.role]); // Use specific user properties instead of refreshCampaigns

  const checkAuth = useCallback(async () => {
    if (!isClient) return; // Don't run auth check until client-side
    
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          
          // Restore agent status from localStorage only on client-side
          if (isClient) {
            const savedStatus = localStorage.getItem('omnivox-agent-status');
            if (savedStatus && ['Available', 'Unavailable', 'On Call', 'Break', 'Offline'].includes(savedStatus)) {
              setAgentStatus(savedStatus);
              console.log('🔄 Restored agent status from localStorage:', savedStatus);
            }
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }, [isClient]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
        
        // Store in localStorage for cross-tab persistence (only on client-side)
        if (isClient) {
          localStorage.setItem('omnivox-agent-status', newStatus);
        }
        
        console.log(`✅ AuthContext: Agent status updated to: ${newStatus}`);
        return { success: true };
      } else {
        console.error('❌ Backend returned error:', data.error);
        
        // FALLBACK: Update status locally even if backend fails
        console.log('🔄 Fallback: Updating status locally due to backend failure');
        setAgentStatus(newStatus);
        
        if (isClient) {
          localStorage.setItem('omnivox-agent-status', newStatus);
        }
        
        return { success: true, message: 'Status updated locally (backend unavailable)' };
      }
    } catch (error: any) {
      console.error('❌ Status update error:', error);
      console.log('� Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 200)
      });
      
      // FALLBACK: Update status locally even if network fails
      console.log('🔄 Fallback: Updating status locally due to network failure');
      setAgentStatus(newStatus);
      
      if (isClient) {
        localStorage.setItem('omnivox-agent-status', newStatus);
      }
      
      return { success: true, message: 'Status updated locally (network error)' };
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
        
        // Store comprehensive session data for tracking
        if (isClient) {
          const sessionData = {
            token: data.token,
            sessionId: data.sessionId,
            loginTime: data.loginTime || new Date().toISOString(),
            userId: data.user.id,
            userEmail: data.user.email,
            userName: data.user.username
          };
          
          // Store auth data
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('omnivox_token', data.token);
          localStorage.setItem('sessionData', JSON.stringify(sessionData));
          
          console.log('💾 AuthContext: Stored session data:', {
            sessionId: data.sessionId,
            loginTime: data.loginTime,
            userId: data.user.id
          });
          
          // Track session start time for duration calculation
          sessionStorage.setItem('sessionStartTime', new Date().toISOString());
        }
        
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
      
      // Calculate session duration before clearing storage
      let sessionDurationSeconds = 0;
      if (isClient) {
        const sessionStartTime = sessionStorage.getItem('sessionStartTime');
        const sessionData = localStorage.getItem('sessionData');
        
        if (sessionStartTime) {
          const startTime = new Date(sessionStartTime);
          const endTime = new Date();
          sessionDurationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          
          console.log('📊 Session duration calculated:', {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            durationSeconds: sessionDurationSeconds,
            durationFormatted: `${Math.floor(sessionDurationSeconds / 3600)}h ${Math.floor((sessionDurationSeconds % 3600) / 60)}m ${sessionDurationSeconds % 60}s`
          });
        }
        
        if (sessionData) {
          try {
            const parsedSessionData = JSON.parse(sessionData);
            console.log('🔓 Logging out session:', {
              sessionId: parsedSessionData.sessionId,
              userId: parsedSessionData.userId,
              userEmail: parsedSessionData.userEmail,
              loginTime: parsedSessionData.loginTime,
              sessionDurationSeconds
            });
          } catch (e) {
            console.warn('⚠️ Could not parse session data for logout tracking');
          }
        }
      }
      
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
      
      // Clear all client-side storage (only on client-side)
      if (isClient) {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Clear AuthContext state
      setUser(null);
      setCurrentCampaign(null);
      setAvailableCampaigns([]);
      setAgentStatus('Unavailable');
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