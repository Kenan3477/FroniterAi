import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Force deployment to test schema migration
// Railway deployment refresh - fixing 404 Application not found
// Updated: 2026-03-18 08:39 - Force deploy with permission fixes
// Deploy real transcript routes - March 11, 2026
// FORCE DEPLOY v1.0.5: Schema migration fix for organizationId fields - 2026-03-18 09:15

import config from './config';
import { connectDatabase } from './database';
import { connectRedis } from './config/redis';
import { errorHandler, notFound } from './middleware/errorHandler';
import { migrateProductionDatabase } from './database/migrate-production-simple';
import { rateLimiter } from './middleware/rateLimiter';
import { securityMonitor } from './middleware/security'; // SECURITY: Enhanced security monitoring
import { checkIPWhitelist } from './middleware/ipWhitelist'; // IP WHITELIST: Bypass rate limiting for trusted IPs
import { ensureBasicAgents } from './utils/ensureBasicAgents';

// Import routes
// Auth routes - enable for frontend integration
import authRoutes from './routes/auth'; // Use proper Prisma-based authentication
// Agent routes for frontend integration
import agentRoutes from './routes/agent';
import agentsRoutes from './routes/agents';
import autoDialRoutes from './routes/autoDialRoutes'; // Auto-dial engine routes
import campaignRoutes from './routes/campaignsNew'; // NEW: Production campaign service
import interactionRoutes from './routes/interactionsNew'; // NEW: Production interaction service
// import queueRoutes from './routes/queue'; // TEMPORARILY DISABLED - schema conflicts
import reportsRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard'; // NEW: Executive dashboard API endpoints
import universalQuickActionsRoutes from './routes/universalQuickActions'; // NEW: Adaptive quick actions for all users
import contactRoutes from './routes/contacts'; // Re-enabled for dial queue integration
// Import admin routes - RE-ENABLING CRITICAL ONES
import systemOverviewRoutes from './routes/systemOverview'; // Re-enabled after creating missing route file
// Enhanced user routes with enterprise features
import userRoutes from './routes/users'; // RE-ENABLED - stats endpoint for admin dashboard
import userManagementRoutes from './routes/userManagement'; // Enterprise user management system
import callRecordsRoutes from './routes/callRecords'; // Production call records service
import recordingRoutes from './routes/recordingRoutes'; // Call recording download and streaming
import recordingsRoutes from './routes/recordings'; // NEW: Twilio recording streaming service
import { recordingFixRoutes } from './routes/recordingFix'; // ADMIN: Recording system fixes
import { emergencyRoutes } from './routes/emergency'; // EMERGENCY: Account unlock and debugging
import ipWhitelistRoutes from './routes/ipWhitelist'; // IP WHITELIST: Security IP whitelist management
// import securityRoutes from './routes/security'; // SECURITY: Admin security monitoring dashboard - TEMPORARILY DISABLED
import emergencyCleanupRoutes from './routes/emergencyCleanup'; // EMERGENCY: Call data cleanup when other routes fail
// import apiManagementRoutes from './routes/apiManagement'; // Temporarily disabled - fixing schema issues
// import integrationRoutes from './routes/integrations'; // Temporarily disabled - fixing schema issues
// import businessSettingsRoutes from './routes/businessSettings'; // Temporarily disabled - fixing schema issues
// import campaignManagementRoutes from './routes/campaignManagement'; // DISABLED - schema conflicts
import campaignManagementRoutes from './routes/campaignManagement'; // RE-ENABLED - Fixed with proper Prisma integration
import businessSettingsRoutes from './routes/verySimpleBusinessSettings'; // TEMPORARILY using very simple version for debugging
import webhookRoutes from './routes/webhooks'; // Re-enabled for Twilio webhook handling
import callsRoutes from './routes/callsRoutes'; // TwiML and call management routes
import adminSetupRoutes from './routes/adminSetup'; // Admin setup for initial user creation
// import callsRoutes from './routes/callsRoutes'; // SIP call control system - DISABLED due to schema conflicts
import dispositionsRoutes from './routes/dispositionsRoutes'; // Disposition collection system
import productionDialerRoutes from './routes/productionDialerRoutes'; // PRODUCTION: Real Twilio SIP integration
import callManagementRoutes from './routes/callManagementRoutes'; // PRODUCTION: Call state machine management
import inboundCallRoutes from './routes/inboundCallRoutes'; // PRODUCTION: Inbound call handling system
import routingRoutes from './routes/routingRoutes'; // Inbound call routing system
import voiceRoutes from './routes/voiceRoutes'; // Voice/telephony configuration for CLI selection
import inboundQueueRoutes from './routes/inboundQueueRoutes'; // Inbound queue management system
import cleanupRoutes from './routes/cleanup'; // ADMIN: Emergency cleanup endpoints
import kpiRoutes from './routes/kpi'; // Real database-driven KPI analytics
import dncRoutes from './routes/admin/dnc'; // DNC (Do Not Call) management system
import auditLogRoutes from './routes/admin/auditLogs'; // Audit logs and user session tracking
import advancedAuditRoutes from './routes/advancedAudit'; // Advanced user activity audit system with AI-powered suspicious behavior detection
import adaptiveQuickActionsRoutes from './routes/adaptiveQuickActions'; // NEW: Advanced adaptive quick actions with AI-powered workflow intelligence
// import pauseEventsRoutes from './routes/pauseEventsSecure'; // ✅ SECURE: Agent pause/break tracking with audit trails - TEMPORARILY DISABLED
import testRoutes from './routes/test'; // Testing and debugging endpoints
import updateOrgAdminRoutes from './routes/updateOrgAdmin'; // Temporary route to fix existing org admin names
import migrationRoutes from './routes/migration'; // Database migration endpoints
import stuckCallMonitoringRoutes from './routes/stuckCallMonitoring'; // 🚨 CRITICAL: Stuck call prevention and monitoring

// NEW: Stripe Payment Integration Routes
import integrationRoutes from './routes/integrations'; // Apps & Integrations management
import stripeRoutes from './routes/stripe'; // Stripe payment portal integration

// NEW: Audio File Storage Routes
import audioRoutes from './routes/audioRoutes'; // Audio file upload, storage, and streaming
import audioFileRoutes from './routes/audioFileRoutes'; // Audio file upload and management for IVR prompts

// Temporarily disabled routes with model conflicts - RE-ENABLING CRITICAL ONES
// import campaignRoutes from './routes/campaigns';
// import interactionRoutes from './routes/interactions';
// import analyticsRoutes from './routes/analytics'; // DISABLED - schema conflicts
// import webhookRoutes from './routes/webhooks'; // Temporarily disabled - fixing schema issues

// Import Omnivox-AI Flows routes - ENABLED
import flowRoutes from './routes/flows'; // ENABLED - User model conflict fixed
// import flowVersionRoutes from './routes/flowVersions'; // DISABLED - dependent on flows
// import nodeTypeRoutes from './routes/nodeTypes';
// import flowExecutionRoutes from './routes/flowExecution';

// Import Dialler System routes - STILL DISABLED DUE TO MISSING SERVICES
// import diallerAgentRoutes from './routes/diallerAgents'; // Disabled - missing services
// import diallerCampaignRoutes from './routes/diallerCampaigns'; // Disabled - schema issues  
// import diallerCallRoutes from './routes/diallerCalls'; // Disabled - missing services
import dialerRoutes from './routes/dialer'; // NEW: Twilio dialer routes
import dialQueueRoutes from './routes/dialQueue'; // NEW: Dial queue system
import eventTestRoutes from './routes/eventTest'; // NEW: Event system testing

// Phase 3: Advanced Features (Enhancement) Routes - RE-ENABLED
import flowVersioningRoutes from './routes/flowVersioning'; // NEW: Flow versioning and rollback system
import flowMonitoringRoutes from './routes/flowMonitoring'; // NEW: Real-time flow monitoring dashboard
import flowOptimizationRoutes from './routes/flowOptimization'; // NEW: AI-powered flow optimization
import multiTenantFlowRoutes from './routes/multiTenantFlow'; // NEW: Multi-tenant flow management

// Phase 3: Advanced AI Dialler Features - NEW
import sentimentAnalysisRoutes from './routes/sentimentAnalysis'; // NEW: Real-time sentiment analysis and coaching
import autoDispositionRoutes from './routes/autoDispositionRoutes'; // NEW: AI-powered auto-disposition
import leadScoringRoutes from './routes/leadScoringRoutes'; // NEW: AI-driven lead scoring
// import autoDispositionRoutes from './routes/autoDisposition'; // NEW: AI-powered auto-disposition - TEMPORARILY DISABLED
import interactionHistoryRoutes from './routes/interactionHistory'; // NEW: Call history for manual and auto-dial
import workingTranscriptRoutes from './routes/workingTranscriptRoutes'; // WORKING: No-auth transcript routes
// import transcriptManagementRoutes from './routes/transcriptManagement'; // NEW: Transcription system management API
import liveAnalysisRoutes from './routes/liveAnalysisRoutes'; // NEW: Intelligent live call analysis system
import advancedReportsRoutes from './routes/advancedReports'; // NEW: Enterprise-grade AI dialler reporting with predictive analytics

// import { initializeTranscriptionSystem } from './scripts/initializeTranscription';

// Import AI System Management
import createAIRoutes from './routes/aiRoutes'; // NEW: AI System Integration API
import AISystemManager from './ai/AISystemManager'; // NEW: AI System Manager

// Import Dial Rate Management
import createDialRateRoutes from './controllers/dialRateController'; // NEW: Real-time dial rate and routing control
import createEnhancedDiallerRoutes from './routes/enhancedDiallerRoutes'; // NEW: Enhanced auto-dialler with rate control

// Import socket handlers
import { initializeSocket } from './socket';

class App {
  public app: express.Application;
  public server: any;
  public io: Server;
  public aiManager: AISystemManager; // NEW: AI System Manager

  constructor() {
    this.app = express();
    
    // Trust proxy - required for Railway and rate limiting
    this.app.set('trust proxy', 1);
    
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.frontend.url,
        credentials: true,
      },
    });

    this.initializeMiddlewares();
    // Note: Error handling moved to after routes are initialized
    this.initializeSocket();
  }

  private initializeMiddlewares(): void {
    // Security middleware - FIRST for maximum protection
    this.app.use(helmet());
    this.app.use(securityMonitor.detectSuspiciousActivity); // SECURITY: Monitor all requests
    
    // IP Whitelist - BEFORE rate limiting to set whitelist flag
    this.app.use(checkIPWhitelist); // IP WHITELIST: Mark whitelisted IPs to bypass rate limiting
    
    // CORS - Allow all origins for development
    this.app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow all origins in development
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 86400 // 24 hours
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static audio files (for TTS replacement)
    // Audio prompts served from /audio/* (no authentication required for Twilio)
    this.app.use('/audio', express.static(path.join(__dirname, '../public/audio'), {
      maxAge: '1d', // Cache for 1 day
      setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*'); // Allow Twilio to access
        res.set('Content-Type', 'audio/mpeg');
      }
    }));

    // Rate limiting
    this.app.use(rateLimiter);
  }

  private async initializeRoutes(): Promise<void> {
    // Root endpoint for Railway health check
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Omnivox-AI Backend',
        status: 'running',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.env
      });
    });

    // Health check with database status
    this.app.get('/health', async (req, res) => {
      try {
        // Import database health check
        const { checkDatabaseHealth } = await import('./database/index');
        const dbHealth = await checkDatabaseHealth();
        
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          database: {
            connected: dbHealth,
            type: process.env.DATABASE_URL?.startsWith('postgresql://') ? 'PostgreSQL' : 'SQLite'
          },
          services: {
            recordings: 'ready', // Twilio recording streaming ready
            auth: 'ready',
            campaigns: 'ready'
          }
        });
      } catch (error) {
        res.status(503).json({
          status: 'degraded',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
          database: {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    });

    // API routes - enable critical routes for frontend integration
    this.app.use('/api/auth', authRoutes); // Auth routes - enabled and working
    this.app.use('/api/agent', agentRoutes); // Single agent status
    this.app.use('/api/agents', agentsRoutes); // Agents queue and management
    // this.app.use('/api/pause-events', pauseEventsRoutes); // Agent pause/break reason tracking system - TEMPORARILY DISABLED
    this.app.use('/api/auto-dial', autoDialRoutes); // Auto-dial engine management
    this.app.use('/api/campaigns', campaignRoutes); // NEW: Production campaign management service
    this.app.use('/api/interactions', interactionRoutes); // NEW: Production interaction tracking service
    // this.app.use('/api/queue', queueRoutes); // Campaign queue management for agents - TEMPORARILY DISABLED
    this.app.use('/api/reports', reportsRoutes); // Reports endpoints
    this.app.use('/api/dashboard', dashboardRoutes); // NEW: Executive dashboard endpoints
    this.app.use('/api/dashboard', universalQuickActionsRoutes); // NEW: Adaptive quick actions for all users
    this.app.use('/api/contacts', contactRoutes); // Contact management - re-enabled for dial queue
    this.app.use('/api/admin/users', userRoutes); // RE-ENABLED - stats endpoint for admin dashboard
    this.app.use('/api/users', userRoutes); // User endpoints for regular user access (my-campaigns, etc.)
    this.app.use('/api/user-management', userManagementRoutes); // Enterprise user management system
    this.app.use('/api/call-records', callRecordsRoutes); // Production call records service
    this.app.use('/api/recordings', recordingsRoutes); // NEW: Twilio recording streaming service
    this.app.use('/api', workingTranscriptRoutes); // WORKING: No-auth transcript routes
    // this.app.use('/api/admin/transcripts', transcriptManagementRoutes); // Transcription system management API
    // this.app.use('/api/admin/api', apiManagementRoutes); // Admin API management - temporarily disabled
    this.app.use('/api/integrations', integrationRoutes); // NEW: Apps & Integrations management
    this.app.use('/api/stripe', stripeRoutes); // NEW: Stripe payment portal integration
    this.app.use('/api/audio', audioRoutes); // NEW: Audio file storage and streaming
    // this.app.use('/api/admin/business-settings', businessSettingsRoutes); // DISABLED - schema conflicts
    // this.app.use('/api/admin/campaign-management', campaignManagementRoutes); // DISABLED - schema conflicts
    this.app.use('/api/admin/campaign-management', campaignManagementRoutes); // RE-ENABLED - Fixed with proper Prisma integration
    this.app.use('/api/admin/business-settings', businessSettingsRoutes); // RE-ENABLED - Needed for frontend business settings
    this.app.use('/api/admin/dnc', dncRoutes); // DNC (Do Not Call) management system
    this.app.use('/api/admin', auditLogRoutes); // Audit logs and user session tracking for login/logout reports
    this.app.use('/api/admin/advanced-audit', advancedAuditRoutes); // Advanced user activity audit system with AI-powered suspicious behavior detection
    this.app.use('/api/admin/quick-actions', adaptiveQuickActionsRoutes); // NEW: Advanced adaptive quick actions with AI-powered workflow intelligence
    this.app.use('/api/admin/system', systemOverviewRoutes); // Admin system overview - re-enabled
    // Temporarily disabled routes with model conflicts - RE-ENABLING CRITICAL ONES
    // this.app.use('/api/contacts', contactRoutes); // DISABLED - schema conflicts
    // this.app.use('/api/campaigns', campaignRoutes); // Disabled - model not in schema
    // this.app.use('/api/interactions', interactionRoutes); // Disabled - model not in schema
    // this.app.use('/api/analytics', analyticsRoutes); // DISABLED - schema conflicts
    this.app.use('/api/webhooks', webhookRoutes); // Re-enabled for Twilio webhook handling
    this.app.use('/api/calls-twiml', callsRoutes); // TwiML and call management routes
    this.app.use('/api/emergency', emergencyCleanupRoutes); // Emergency cleanup routes for nuclear reset
    this.app.use('/api/calls', callsRoutes); // Frontend compatibility for save-call-data
    this.app.use('/api/admin-setup', adminSetupRoutes); // Admin setup for initial user creation
    this.app.use('/api/admin', cleanupRoutes); // TEMPORARILY ENABLED: Admin cleanup endpoints for demo record removal
    this.app.use('/api/admin', updateOrgAdminRoutes); // TEMPORARY: Fix existing organization administrator names
    this.app.use('/api/admin', migrationRoutes); // Database migration endpoints
    this.app.use('/api/admin/recordings', recordingFixRoutes); // ADMIN: Recording system fixes and data creation
    this.app.use('/api/stuck-calls', stuckCallMonitoringRoutes); // 🚨 CRITICAL: Stuck call prevention monitoring and manual cleanup
    this.app.use('/api/emergency', emergencyRoutes); // EMERGENCY: Account unlock and debugging endpoints (no auth required)
    this.app.use('/api/admin/ip-whitelist', ipWhitelistRoutes); // IP WHITELIST: Security IP whitelist management (SUPER_ADMIN only)
    // this.app.use('/api/security', securityRoutes); // SECURITY: Admin security monitoring dashboard (auth required) - TEMPORARILY DISABLED
    this.app.use('/api/test', testRoutes); // Testing and debugging endpoints
    this.app.use('/api/dispositions', dispositionsRoutes); // Disposition collection system
    this.app.use('/api/routing', routingRoutes); // Inbound call routing system
    this.app.use('/api/voice', voiceRoutes); // Voice/telephony configuration for CLI selection
    this.app.use('/api/voice', inboundQueueRoutes); // Inbound queue management system (under /api/voice/inbound-queues)
    this.app.use('/api/voice', audioFileRoutes); // Audio file upload and management (under /api/voice/audio-files)
    this.app.use('/api/dialer', productionDialerRoutes); // PRODUCTION: Real Twilio SIP dialer with telephony integration
    this.app.use('/api/call-management', callManagementRoutes); // PRODUCTION: Call state machine for finite-state call lifecycle management
    this.app.use('/api/interaction-history', interactionHistoryRoutes); // NEW: Call history for manual and auto-dial with categorization

    // Omnivox-AI Flows API routes - ENABLED
    this.app.use('/api/flows', flowRoutes); // ENABLED - User model conflict fixed
    // this.app.use('/api/flows/:flowId/versions', flowVersionRoutes); // DISABLED - dependent on flows
    // this.app.use('/api/flow-node-types', nodeTypeRoutes);
    // this.app.use('/api/flow-execution', flowExecutionRoutes);

    // Phase 3: Advanced Features (Enhancement) Routes - RE-ENABLED
    this.app.use('/api/flow-versioning', flowVersioningRoutes); // Flow versioning and rollback system
    this.app.use('/api/flow-monitoring', flowMonitoringRoutes); // Real-time flow monitoring dashboard
    this.app.use('/api/flow-optimization', flowOptimizationRoutes); // AI-powered flow optimization
    this.app.use('/api/multi-tenant', multiTenantFlowRoutes); // Multi-tenant flow management

    // Phase 3: Advanced AI Dialler Features - NEW
    this.app.use('/api/sentiment', sentimentAnalysisRoutes); // Real-time sentiment analysis and coaching
    this.app.use('/api/auto-disposition', autoDispositionRoutes); // AI-powered auto-disposition
    this.app.use('/api/lead-scoring', leadScoringRoutes); // AI-driven lead scoring
    this.app.use('/api/live-analysis', liveAnalysisRoutes); // NEW: Intelligent live call analysis system
    this.app.use('/api/advanced-reports', advancedReportsRoutes); // NEW: Enterprise-grade AI dialler reporting with predictive analytics
    
    // AI System Integration Routes - NEW: Phase 2 Real-time AI Features
    if (this.aiManager) {
      const { prisma } = await import('./database');
      this.app.use('/api/ai', createAIRoutes(prisma, this.aiManager)); // AI system management and integration
      
      // Real-time dial rate and routing control
      this.app.use('/api/campaigns', createDialRateRoutes(prisma, this.io)); // Campaign dial rate management
      this.app.use('/api/campaigns', createEnhancedDiallerRoutes(prisma, this.io)); // Enhanced auto-dialler with rate control
    }
    
    // Dialler System API routes - STILL DISABLED DUE TO MISSING SERVICES
    // this.app.use('/api/dialler/agents', diallerAgentRoutes); // Disabled - missing services
    // this.app.use('/api/dialler/campaigns', diallerCampaignRoutes); // Disabled - schema issues
    // this.app.use('/api/dialler/calls', diallerCallRoutes); // Disabled - missing services
    this.app.use('/api/kpi', kpiRoutes); // Re-enabled with basic implementation
    
    // NEW: Twilio Dialer API routes - THIS IS THE ONE WE NEED FOR TOKENS
    this.app.use('/api/calls', dialerRoutes); // Twilio-based dialer system (includes /token endpoint)
    this.app.use('/api/calls', inboundCallRoutes); // PRODUCTION: Inbound call handling webhooks and management
    this.app.use('/api/dial-queue', dialQueueRoutes); // Dial queue system for auto-dialer
    this.app.use('/api/events', eventTestRoutes); // Real-time event system testing

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Omnivox-AI API',
        version: '1.0.0',
        description: 'Omnivox-AI Platform API Server',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          contacts: '/api/contacts',
          campaigns: '/api/campaigns',
          interactions: '/api/interactions',
          analytics: '/api/analytics',
          webhooks: '/api/webhooks',
          flows: '/api/flows',
          flowNodeTypes: '/api/flow-node-types',
          flowExecution: '/api/flow-execution',
          diallerAgents: '/api/dialler/agents',
          diallerCampaigns: '/api/dialler/campaigns',
          diallerCalls: '/api/dialler/calls',
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);
    
    // Error handler
    this.app.use(errorHandler);
  }

  private initializeSocket(): void {
    initializeSocket(this.io);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      console.log('✅ Database connected');

      // Initialize AI System Manager
      const { prisma } = await import('./database');
      this.aiManager = new AISystemManager(prisma, this.io);
      console.log('🤖 AI System Manager initialized');

      // Initialize routes after AI manager is ready
      await this.initializeRoutes();
      
      // Initialize error handling AFTER routes are registered
      this.initializeErrorHandling();
      console.log('✅ Error handling initialized after routes');

      // Run production database migration (Railway deployment) - TEMPORARILY DISABLED
      // if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
      //   console.log('🚀 Running production database migration...');
      //   try {
      //     await migrateProductionDatabase();
      //     console.log('✅ Production migration completed');
      //   } catch (migrationError) {
      //     console.error('❌ Production migration failed:', migrationError);
      //     // Continue startup even if migration fails
      //   }
      // }

      // Connect to Redis
      await connectRedis();
      console.log('✅ Redis connected');

      // Ensure basic system agents exist
      await ensureBasicAgents();

      // Initialize transcription system
      try {
        // await initializeTranscriptionSystem();
      } catch (transcriptionError) {
        console.warn('⚠️ Transcription system initialization failed:', transcriptionError);
        console.log('📞 Server will start without transcription features');
      }

      // 🚨 CRITICAL: Start stuck call monitoring to prevent customers being dropped
      console.log('🔍 Initializing stuck call prevention system...');
      const { startStuckCallMonitoring } = await import('./services/stuckCallPrevention');
      startStuckCallMonitoring();
      console.log('✅ Stuck call prevention system active - monitoring every 60s');

      // Start server
      const port = config.server.port;
      const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
      
      this.server.listen(port, host, () => {
        console.log(`🚀 Server running on ${host}:${port}`);
        console.log(`📚 API documentation available at http://${host}:${port}/api`);
        console.log(`🩺 Health check available at http://${host}:${port}/health`);
        console.log(`🔧 Environment: ${config.server.env}`);
        console.log(`🌐 Binding to: ${host} (Railway compatible)`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new App();
app.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;