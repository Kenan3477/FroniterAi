import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  setActiveFeature,
  toggleSidebar,
  addNotification,
  markNotificationRead,
  clearNotifications,
  updateUsageStats,
  setFeatureCards,
  updateFeatureCard,
} from '../store/dashboardSlice';
import { addMessage, setStreamingResponse, clearMessages } from '../store/conversationSlice';
import { trackEvent, updatePerformanceMetric } from '../store/analyticsSlice';
import { conversationService } from '../services/conversationService';
import { apiService } from '../services/apiService';
import ChatInterface from './ChatInterface';
import FeatureCard from './FeatureCard';
import MetricsPanel from './MetricsPanel';
import NotificationCenter from './NotificationCenter';
import { 
  ChatBubbleLeftIcon, 
  ChartBarIcon, 
  CogIcon, 
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { 
    activeFeature, 
    sidebarOpen, 
    notifications, 
    usageStats, 
    featureCards 
  } = useSelector((state: RootState) => state.dashboard);
  const { messages, isStreaming } = useSelector((state: RootState) => state.conversation);
  const { theme, layout, conversationSettings } = useSelector((state: RootState) => state.userPreferences);

  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Initialize dashboard and services
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);

        // Track dashboard load
        dispatch(trackEvent({
          event: 'dashboard_loaded',
          properties: { userId: user?.id, timestamp: Date.now() }
        }));

        // Connect to conversation service
        if (user?.id) {
          const token = localStorage.getItem('frontier_token');
          if (token) {
            await conversationService.connect(token);
            setIsConnected(true);

            // Start conversation
            const convId = await conversationService.startConversation(user.id);
            setConversationId(convId);
          }
        }

        // Load dashboard data
        await loadDashboardData();

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        dispatch(addNotification({
          id: `error-${Date.now()}`,
          type: 'error',
          title: 'Connection Error',
          message: 'Failed to connect to Frontier services. Some features may be limited.',
          timestamp: Date.now(),
        }));
        setLoading(false);
      }
    };

    if (user) {
      initializeDashboard();
    }

    // Cleanup on unmount
    return () => {
      conversationService.disconnect();
    };
  }, [user, dispatch]);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      // Load analytics data
      const analytics = await apiService.getDashboardMetrics('7d');
      dispatch(updatePerformanceMetric({
        metric: 'dashboard_load_time',
        value: Date.now(),
        context: { timeframe: '7d' }
      }));

      // Load available tools/features
      const tools = await apiService.getAvailableTools();
      const cards = tools.map(tool => ({
        id: tool.name,
        title: tool.name.charAt(0).toUpperCase() + tool.name.slice(1),
        description: tool.description,
        category: tool.category,
        icon: getIconForTool(tool.name),
        enabled: tool.enabled,
        lastUsed: null,
        usageCount: 0,
        avgRating: 0,
        permissions: tool.permissions,
      }));
      dispatch(setFeatureCards(cards));

      // Update usage stats
      dispatch(updateUsageStats({
        totalSessions: analytics.metrics.customers || 0,
        avgSessionDuration: 15, // minutes
        totalMessages: messages.length,
        toolsUsed: new Set(messages.filter(m => m.toolCalls?.length).map(m => m.toolCalls![0].name)).size,
        satisfactionScore: analytics.metrics.satisfaction || 0,
      }));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  // Get icon for tool
  const getIconForTool = (toolName: string): string => {
    const iconMap: Record<string, string> = {
      analytics: 'ChartBarIcon',
      chat: 'ChatBubbleLeftIcon',
      settings: 'CogIcon',
      ai: 'SparklesIcon',
      notifications: 'BellIcon',
    };
    return iconMap[toolName] || 'SparklesIcon';
  };

  // Handle feature selection
  const handleFeatureSelect = useCallback(async (featureId: string) => {
    dispatch(setActiveFeature(featureId));
    dispatch(trackEvent({
      event: 'feature_selected',
      properties: { featureId, userId: user?.id }
    }));

    // Update feature usage
    dispatch(updateFeatureCard({
      id: featureId,
      updates: { 
        lastUsed: Date.now(),
        usageCount: featureCards.find(f => f.id === featureId)?.usageCount + 1 || 1
      }
    }));

    // Send context to conversation service
    if (conversationService.getContext()) {
      conversationService.updateContext({
        activeFeatures: [featureId],
        userIntent: `Selected feature: ${featureId}`,
      });
    }
  }, [dispatch, user?.id, featureCards]);

  // Handle chat message
  const handleChatMessage = useCallback(async (message: string) => {
    if (!conversationId || !isConnected) return;

    dispatch(addMessage({
      id: `msg-${Date.now()}`,
      content: message,
      role: 'user',
      timestamp: Date.now(),
    }));

    dispatch(trackEvent({
      event: 'message_sent',
      properties: { messageLength: message.length, conversationId }
    }));

    let assistantMessageId = `msg-${Date.now() + 1}`;
    let fullResponse = '';

    // Send message with streaming response
    conversationService.sendMessage(
      message,
      (chunk) => {
        fullResponse += chunk.content;
        dispatch(setStreamingResponse({
          id: assistantMessageId,
          content: fullResponse,
          isComplete: chunk.finished,
          suggestions: chunk.suggestions || [],
        }));
      },
      () => {
        // Message complete
        dispatch(addMessage({
          id: assistantMessageId,
          content: fullResponse,
          role: 'assistant',
          timestamp: Date.now(),
          suggestions: [],
        }));

        dispatch(trackEvent({
          event: 'message_received',
          properties: { 
            responseLength: fullResponse.length, 
            conversationId,
            processingTime: Date.now() - Date.now() // This would be calculated properly
          }
        }));
      },
      (error) => {
        console.error('Chat error:', error);
        dispatch(addNotification({
          id: `error-${Date.now()}`,
          type: 'error',
          title: 'Chat Error',
          message: 'Failed to send message. Please try again.',
          timestamp: Date.now(),
        }));
      }
    );
  }, [conversationId, isConnected, dispatch]);

  // Handle tool usage
  const handleToolUse = useCallback(async (toolName: string, parameters: any) => {
    try {
      dispatch(trackEvent({
        event: 'tool_used',
        properties: { toolName, parameters, userId: user?.id }
      }));

      const result = await conversationService.callTool(
        toolName,
        parameters,
        (progress) => {
          // Handle tool progress updates
          dispatch(addNotification({
            id: `tool-progress-${Date.now()}`,
            type: 'info',
            title: `${toolName} Progress`,
            message: `${progress.message || 'Processing...'}`,
            timestamp: Date.now(),
          }));
        }
      );

      // Add tool result to conversation
      dispatch(addMessage({
        id: `tool-result-${Date.now()}`,
        content: `Tool "${toolName}" completed successfully.`,
        role: 'assistant',
        timestamp: Date.now(),
        toolCalls: [{ name: toolName, parameters, result }],
      }));

    } catch (error) {
      console.error('Tool execution error:', error);
      dispatch(addNotification({
        id: `tool-error-${Date.now()}`,
        type: 'error',
        title: 'Tool Error',
        message: `Failed to execute ${toolName}. Please try again.`,
        timestamp: Date.now(),
      }));
    }
  }, [dispatch, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Initializing Frontier Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
              >
                {sidebarOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
              <h1 className="ml-4 text-2xl font-bold text-gray-900 dark:text-white">
                Frontier Dashboard
              </h1>
              {!isConnected && (
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Offline
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationCenter
                notifications={notifications}
                onMarkRead={(id) => dispatch(markNotificationRead(id))}
                onClearAll={() => dispatch(clearNotifications())}
              />
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Welcome, {user?.name}
              </div>
              
              <img
                className="h-8 w-8 rounded-full"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=random`}
                alt={user?.name}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <SparklesIcon className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
                  Features
                </span>
              </div>
              
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {featureCards.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => handleFeatureSelect(feature.id)}
                    className={`${
                      activeFeature === feature.id
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left`}
                  >
                    <span className="mr-3 h-5 w-5" aria-hidden="true">
                      {/* Icon would be rendered here based on feature.icon */}
                      ⚡
                    </span>
                    {feature.title}
                    {feature.usageCount > 0 && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {feature.usageCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div>Sessions: {usageStats.totalSessions}</div>
                <div>Satisfaction: {usageStats.satisfactionScore}/5</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-0">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Metrics Panel */}
              <div className="mb-8">
                <MetricsPanel />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Feature Cards */}
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Available Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {featureCards.map((feature) => (
                        <FeatureCard
                          key={feature.id}
                          feature={feature}
                          isActive={activeFeature === feature.id}
                          onSelect={() => handleFeatureSelect(feature.id)}
                          onUse={(params) => handleToolUse(feature.id, params)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chat Interface */}
                <div className="lg:col-span-1">
                  <ChatInterface
                    messages={messages}
                    isStreaming={isStreaming}
                    isConnected={isConnected}
                    onSendMessage={handleChatMessage}
                    onClearChat={() => dispatch(clearMessages())}
                    settings={conversationSettings}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
